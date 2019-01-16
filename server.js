
var express = require("express");
var mongojs = require("mongojs");
var axios = require("axios");
var cheerio = require("cheerio");
var db = require("./models");
var bodyParser = require("body-parser");
var app = express();
var exphbs = require("express-handlebars");
var mongoose = require("mongoose");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var dbURI = "mongodb://localhost/mongoHeadlines";
// console.log(process.env.MONGODB_URI);
// if (process.env.MONGODB_URI) {
    mongoose.connect("mongodb://heroku_g8j3plbf:8i7btepunr9ur8l593tmul2pk5@ds157574.mlab.com:57574/heroku_g8j3plbf")
// } else {
//     // console.log("MONGODB_URI="+MONGODB_URI);
//     mongoose.connect(dbURI);
// }

var db = mongoose.connection;

db.on("error", function(err){
    console.log("Mongoose Error: ", err);
})

db.once("open", function(){
    console.log("Mongoose connection successful");
});

app.use(express.static("public"));
var PORT = process.env.PORT || 3019;

var databaseUrl = process.env.DB_URL || "huffingpostdb";
var collections = ["news"];

console.log("databaseUrl=" + databaseUrl);

var db = mongojs(databaseUrl, collections);
db.on("error", (err) => {
    console.log("database error: " + err)
});

app.get("/", (req, res) => {


    axios.get("https://www.huffingtonpost.com/").then(function (response) {
        var $ = cheerio.load(response.data);

        $(".card").each(function (i, element) {

            var title = $(this)
                .children(".card__content")
                .children(".card__details")
                .children(".card__headlines")
                .children(".card__headline")
                .children("a")
                .children(".card__headline__text")
                .text();


            var summary = $(this)
                .children(".card__content")
                .children(".card__details")
                .children(".card__headlines")
                .children(".card__description")
                .children("a")
                .text();

            var image = $(this)
                .children(".card__content")
                .children("a")
                .children(".card__image")
                .children("img")
                .attr("src");

            var author = $(this)
                .children(".card__content")
                .children(".card__details")
                .children(".card__headlines")
                .children(".card__byline")
                .children(".author-list")
                .children("a")
                .text();


            var link = $(this)
                .children(".card__content")
                .children(".card__details")
                .children(".card__headlines")
                .children(".card__headline")
                .children("a")
                .attr("href");

            var newLink = "http://huffingtonpost.com" + link;

            if (title && summary && image && author && newLink) {
                db.news.insert({
                    title: title,
                    summary: summary,
                    image: image,
                    author: author,
                    link: newLink,
                    comments: []
                }),

                    (err, inserted) => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(inserted);
                        }
                    }
            }

        });

        db.news.find({}, (error, found) => {
            if (error) {
                console.log(error);
            } else {
                res.render("index", { articles: found });
            }
        });

    })

});


app.get("/comments/:id", (req, res) => {

    console.log(req.params.id);

    db.news.findOne(
        {
            _id: mongojs.ObjectId(req.params.id)
        },
        function (error, found) {
            if (error) {
                console.log(error);
                res.send(error);
            }
            else {
                console.log(found.title);
                //res.send(found.title);
                res.render("comments", { article: found });

            }
        }
    )
});


app.post("/add/:id", (req, res) => {
    // console.log(req.params.id);

    // console.log(req.body);

    db.news.update(
        { _id: mongojs.ObjectId(req.params.id) },
        { $push: { comments: req.body } },
        function (error, found) {
            if (error) {
                console.log(error);
            } else {
                db.news.findOne(
                    {
                        _id: mongojs.ObjectId(req.params.id)
                    },
                    function (error, found) {
                        if (error) {
                            console.log(error);
                            res.send(error);
                        }
                        else {
                            console.log(found.title);

                            res.render("comments", { article: found });

                        }
                    }
                )
            }
        });

});


app.post("/updateComment/:id/:index", (req, res) => {
    console.log("updaing comment: " + JSON.stringify(req.body));

    db.news.findOne(
        {
            _id: mongojs.ObjectId(req.params.id)
        },
        (error, found) => {

            if (error) {
                console.log(error);
                res.send(error);
            }
            else {
                found.comments[parseInt(req.params.index)] = req.body;

                console.log(JSON.stringify(found));

                db.news.update({_id: mongojs.ObjectId(req.params.id)}, found, (error, records, status) => {
                    if(error) {
                        console.log(error);
                        res.send(error);
                    }
                    else {
                        res.render("comments", { article: found });
                    }
                });

                
            }
        }
    )
});


app.get("/GetCommentforUpdate/:id/:index", (req, res) => {
    db.news.findOne(
        {
            _id: mongojs.ObjectId(req.params.id)
        },
        (error, found) => {

            if (error) {
                console.log(error);
                res.send(error);
            }
            else {
                found["editComment"] = found.comments[req.params.index];
                found["editIndex"] = req.params.index;
                res.render("comments", { article: found });
            }
        }
    )
});


app.get("/delete/:id/:index", (req, res) => {
    db.news.findOne(
        {
            _id: mongojs.ObjectId(req.params.id)
        },
        (error, found) => {

            if (error) {
                console.log(error);
                res.send(error);
            }
            else {
                found.comments.splice(parseInt(req.params.index), 1);

                console.log(JSON.stringify(found));

                db.news.update({_id: mongojs.ObjectId(req.params.id)}, found, (error, records, status) => {
                    if(error) {
                        console.log(error);
                        res.send(error);
                    }
                    else {
                        res.render("comments", { article: found });
                    }
                });

                
            }
        }
    )
})

// mongoose.connect('mongodb://user:password@sample.com:port/dbname', { useNewUrlParser: true })


app.listen(PORT, function () {
    console.log(PORT);
});



const express = require("express");

const app  = express();

const bodyParser = require('body-parser');

const pdfcv = require('./routes/pdfcv.routes'); // Imports routes for the products

let fs = require('fs'),
PDFParser = require("pdf2json");


const multer = require("multer");

const {TesseractWorker} = require('tesseract.js');

const worker = new TesseractWorker();

const email = require('node-email-extractor').default;

var uwords = require('uwords');

// storage
const storage = multer.diskStorage(
    {
        destination : (req,file,cb) => {
            cb(null,"./uploads");
        },
        filename : (req,file,cb) => {
            cb(null,file.originalname);
        }
     
    }
);

// Set up mongoose connection
const mongoose = require('mongoose');
let dev_db_url = 'mongodb+srv://guesmi:12345@cluster0.zyvhc.mongodb.net/PdfCV?retryWrites=true&w=majority';
let mongoDB = process.env.MONGODB_URI || dev_db_url;
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

const upload = multer({storage : storage}).single("avatar");
app.set("view engine","ejs");

app.use('/pdfcv', pdfcv);

//ROUTES
app.get("/",(req,res) => {

     res.render("index");

});

app.post("/upload",(req,res) => {

    upload(req,res,err => {
       fs.readFile(`./uploads/${req.file.originalname}`, (err , data ) => {
           if(err) return console.log("i am not uploading",err);
           
           worker
           .recognize(data, "eng" , { tessjs_create_pdf : '1' },{tessedit_pageseg_mode: '1' } )
           .progress(progress => {
               console.log(progress);
           })
           .then(result => {
             console.log(req.file.originalname);
             const file = `${__dirname}/tesseract.js-ocr-result.pdf`;

             // Set up the pdf parser
             let pdfParser = new PDFParser(this, 1);
             pdfParser.loadPDF(file);
             // On data ready
              pdfParser.on("pdfParser_dataReady", (pdfData) => {
                     // The raw PDF data in text form
                     const raw = pdfParser.getRawTextContent().replace(/\r\n/g, " ");
                     if(raw !== null) {
                         var data = email.text(raw);
                         console.log(data);
                         console.log(data["emails"][0]);
                         var words = uwords(raw);
                         console.log(words);
                             // Save the extracted information to a json file
                             fs.appendFileSync("./pdf2json/patients.json", JSON.stringify(data));
                             fs.appendFileSync("./pdf2json/words.json", JSON.stringify(words));
                     }
                 });
     
         //res.json({ message: "Hello from server!" });
         res.download(file);
           })
           .finally ( () => worker.terminate() );  
       });
    });
});


app.get("/download" , (req,res) => {

    const file = `${__dirname}/tesseract.js-ocr-result.pdf`;

        // Set up the pdf parser
        let pdfParser = new PDFParser(this, 1);
        pdfParser.loadPDF(file);
        // On data ready
         pdfParser.on("pdfParser_dataReady", (pdfData) => {
                // The raw PDF data in text form
                const raw = pdfParser.getRawTextContent().replace(/\r\n/g, " ");
                if(raw !== null) {
                    var data = email.text(raw);
                    console.log(data);
                    console.log(data["emails"][0]);
                    var words = uwords(raw);
                    console.log(words);
                        // Save the extracted information to a json file
                        fs.appendFileSync("./pdf2json/patients.json", JSON.stringify(data));
                        fs.appendFileSync("./pdf2json/words.json", JSON.stringify(words));
                }
            });

    //res.json({ message: "Hello from server!" });
    res.download(file);
    
});
app.get("/api", (req, res) => {
    res.json({ message: "Hello from server!" });
  });
// start server
const PORT = 3001 || process.env.PORT ; 
app.listen(PORT , () => console.log("i am up and running"));

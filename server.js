const express = require('express');
const app = express();
require("dotenv").config()
const multer = require('multer');
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const File = require('./models/File');
const moment = require('moment/moment');
const fs = require('node:fs');

mongoose.connect(process.env.DATABASE_URL);

const storage = multer.diskStorage({
	destination: (req, file, callback) => {
		callback(null, 'uploads');
	},
	filename: (req, file, callback) => {
		const name = file.originalname.split(' ').join('_');
		callback(null, moment().valueOf() + name);
	},
});

const upload = multer({ storage: storage });

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
	res.render('index');
});

app.post('/upload', upload.single('file'), async (req, res) => {
	const fileData = {
		path: req.file.path,
		originalName: req.file.originalname,
		uploadDate: moment(),
	};
	if (req.body.password != null && req.body.password !== '') {
		fileData.password = await bcrypt.hash(req.body.password, 10);
	}

	const file = await File.create(fileData);

	res.render('index', { fileLink: `${req.headers.origin}/file/${file.id}`, fileName: `${file.originalName}` });
});

//get file from dynamic route
app.route('/file/:id').get(handleDownload).post(handleDownload);
async function handleDownload(req, res) {
	const file = await File.findById(req.params.id);

	if (file.password != null) {
		if (req.body.password == null) {
			res.render('password');
			return;
		}
		if (!(await bcrypt.compare(req.body.password, file.password))) {
			res.render('password', { error: true });
			return;
		}
	}
	file.downloadCount++;
	await file.save();
	console.log(file.downloadCount);
	res.download(file.path, file.originalName);
}
//delete file from route
app.route('/file/:id/del').get(handleDelete).post(handleDelete);

async function handleDelete(req, res) {
    //delete file
	const file = await File.findById(req.params.id);
    fs.unlink(`${file.path}`, (err) => {
        if (err) throw err;
        console.log('path/file.txt was deleted');
    }); 

    File.findByIdAndDelete(file.id).then(res =>{
        console.log('res :>> ', res);
    }).catch(err=>{
        console.log('err :>> ', err);
    })
    console.log('file.id :>> ', file.id);

    

    //redirect to home page 
    res.render('index')
};



//listen on port
app.listen(process.env.PORT);
console.log('Server listening on :>> ', 'http://localhost:' + process.env.PORT);


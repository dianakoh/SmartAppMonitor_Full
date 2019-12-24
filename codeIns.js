var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var app = express();
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/hello", function(req, res) {
	res.render("hello", {name:req.query.nameQuery});
});

app.get("/hello/:nameParam", function(req, res) {
	res.render("hello", {name:req.params.nameParam});
});

app.get("/code2", function(req, res) {
	res.render("codeIns_pre2", {oricode:req.query.oricodeQuery,concode:req.query.concodeQuery});
});


app.get("/code", function(req, res) {
	//res.render("codeIns", {oricode:req.query.oricodeQuery, checkOption:req.query.checkOptionQuery, concode:req.query.concodeQuery});
	res.render("codeIns", {oricode:req.query.oricodeQuery, concode:req.query.concodeQuery});
});

app.post("/code", function(req, res) {
	const content = req.body.content || '';
	const option = req.body.eventOrHandlerOrActionOrAll || "{all:all}";

	//console.log(content);
	if(!content.length) {
		return res.status(400).json({error: 'Incorrect content'});
	}
	fs.writeFile('SmartApp/temp.txt', content, 'utf-8', function(e) {
		if(e) {
			console.log(e);
		} else {
			console.log('done');
		}
	});
	
	var exec = require('child_process').exec,
		child;

//	child = exec("groovy -cp mysql-connector-java-5.1.42-bin.jar ./samonitor/Main.groovy", function(error, stdout, stderr) {
	child = exec("groovy ./samonitor/Main.groovy", function(error, stdout, stderr) {
	//child = exec("groovy ./samonitor/SmartAppAnalyzerDriver.groovy", function(error, stdout, stderr) {
		console.log('stdout: ' + stdout);
		console.log('stderr: ' + stderr);
		if(error != null) {
			console.log('exec error: ' + error);
		}
		convertCode = stdout;
		if(convertCode != null) {
			res.render("codeIns", {oricode: content, concode: convertCode});
		}
	});
});

app.post("/code/convert", function(req, res) {
	var option = JSON.stringify(req.body);
	option = "\'" + option + "\'";
	console.log(option);
	//console.log(Object.keys(option).length);

	var content;
	fs.readFile('SmartApp/temp.txt', 'utf-8', function(err, data) {
		if(err) {
			console.err(err);
		} else {
			var exec = require('child_process').exec,
				child;
			child = exec("groovy ./samonitor/Main.groovy " + option, function(error, stdout, stderr) {
				console.log('stdout: ' + stdout);
				console.log('stderr: ' + stderr);
				if(error != null) {
					console.log('exec error: ' + error);
				}
				var convertCode = stdout;
				if(convertCode != null) {
					res.render("codeIns", {oricode: data, checkOption: "", concode: convertCode});
				}
			});
		}
	});
});

app.post("/code/checkOption/", function(req, res) {
	const content = req.body.content || '';
	//const option = req.body.eventOrHandlerOrActionOrAll || "all";
	//const oCode = req.body.oCode || '';
	//console.log(oCode);
	//console.log(content);
	if(!content.length) {
		return res.status(400).json({error: 'Incorrect content'});
	}
	fs.writeFile('SmartApp/temp.txt', content, 'utf-8', function(e) {
		if(e) {
			console.log(e);
		} else {
			console.log('done');
		}
	});
	
	var exec = require('child_process').exec,
		child;

//	child = exec("groovy -cp mysql-connector-java-5.1.42-bin.jar ./samonitor/Main.groovy", function(error, stdout, stderr) {
	//child = exec("groovy ./samonitor/Main.groovy " + option, function(error, stdout, stderr) {
	child = exec("groovy ./samonitor/SmartAppAnalyzerDriver.groovy", function(error, stdout, stderr) {
		console.log('stdout: ' + stdout);
		console.log('stderr: ' + stderr);
		if(error != null) {
			console.log('exec error: ' + error);
		}
		convertCode = stdout;
		if(convertCode != null) {
			res.render("codeIns", {oricode: content, checkOption: convertCode, concode: ""});
		}
		});
});



app.get("/simul", function(req, res) {
	res.render("deviceHandlerSimul", {content:req.query.contentQuery, result:req.query.resultQuery});
});

app.post("/simul", function(req, res) {
	const content = req.body.content || '';
	
	if(!content.length) {
		return res.status(400).json({error: 'Incorrect content'});
	}
	
	fs.writeFile('DeviceHandler/temp.groovy', content, 'utf-8', function(e) {
		if(e) {
			console.log(e);
		} else {
			console.log('done');
		}
	});
	
	var exec = require('child_process').exec,
		child;

	child = exec("groovy sm/sl/Main.groovy ", function(error, stdout, stderr) {
		console.log('stdout: ' + stdout);
		console.log('stderr: ' + stderr);
		if(error != null) {
			console.log('exec error: ' + error);
		}
		result = stdout;
		if(result != null) {
			res.render("deviceHandlerSimul", {content: content, result: result});
		}
	
	});
});


app.listen(3030, function(){
	console.log('Server On!');
});

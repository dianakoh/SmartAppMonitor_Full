const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const Op = require('sequelize').Op;
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const models = require('./models');

const server = app.listen(8080, () => {
	console.log('Example app listening on port 8080!');

	require('./models').sequelize.sync()
			.then(() => {
				console.log('Databases sync');
			});
});

const io = require('socket.io')(server);

io.on('connection', (socket) => {
	console.log('a user connected');

	var room = socket.handshake['query']['userId'];
	socket.join(room);
	console.log('user joined room: '+room);
	
	
	socket.on('disconnect', function(){
		socket.leave(room);
		console.log('user disconnected');
	});
});

app.get('/main', function(req, res) {
	res.render("main");
});

app.get('/profile_main', (req, res) => {
	res.render("profile_main");
});
app.get('/EventList', (req, res) => {
	res.render("EventList");
});

app.get('/realtime', (req, res) => {
	res.sendFile(__dirname + '/realtime.html');
});

app.get('/smartAppMonitor', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});

app.get('/:file', (req, res) => {
	res.sendFile(__dirname + '/' + file);
});
app.get('/css/:file', (req, res) => {
	res.sendFile(__dirname + '/css/' + file);
});
app.get('/js/:file', (req, res) => {
	res.sendFile(__dirname + '/js/' + file);
});
app.get('/image/:file', (req, res) => {
	res.sendFile(__dirnam + '/image/' + file);
});

app.get('/login/:id/:pw', (req, res) => {
	const id = req.params.id;
	const pw = req.params.pw;

	models.Users.findAll({
		where: {
			userId: id,
			password: pw
		}
	}).then(users => {
		if(users.length != 0) {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.status(200);
			return res.json({message:"success"});
		}
		else {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.status(404);
			return res.json({message:"there is not the account"});
		}
	});
});

app.get('/register/:id/:pw', (req, res) => {
	const id = req.params.id;
	const pw = req.params.pw;
	const isThere = 1;

	models.Users.findAll({
		where: {
			userId: id
		}
	}).then(users => {
		console.log(users);
		if(users == null || users.length === 0) {
			models.Users.create({
				userId: id,
				password: pw
			}).then(function(re) {
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.status(200);
				return res.json({message:"success"});
			});
		}	
		else {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.status(200);
			return res.json({message:"The account already exists"});
		}
	});
});


app.get('/imageload', (req, res) => {
	fs.readFile('index3.html', (error, data) => {
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end(data);
	});
});

app.get('/fonts', (req, res) => {
	fs.readFile('digital-7.ttf', (error, data) => {
		res.writeHead(200, { 'Content-Type': 'application/x-font-ttf' });
		res.end(data);
	});
});

app.get('/airPollution', (req, res) => {
	fs.readFile('airPollutionChart.html', (error, data) => {
		res.writeHead(200, {
			'Content-Type': 'text/html',
			'Access-Control-Allow-Origin': '*'
		});
		res.end(data);
	});
});

app.get('/flows/all', (req, res) => {
	models.Flow.findAll()
		.then(function(flows) {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.status(200);
			res.json({success:true, data:flows});
		}).catch(function(err) {
			res.status(500);
			res.json({success:false, message:err});
		});
});


app.get('/flows/:id', (req, res) => {
	const appName = req.params.id;
	
	if(!appName.length) {
		return res.status(400).json({error: 'Incorrect appName'});
	}
	
	models.Flow.findAll({
		where: {
			appName: appName
		}
	}).then(flows => {
		if(!flows) {
			return res.status(404).json({success:false, message: 'No Flow'});
		}
		
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json({success:true, data:flows});
		return res;
	});
});

app.get('/flowsbyUser/:id', (req, res) => {
	const userId = req.params.id;
	if(!userId.length) {
		return res.status(400).json({error: 'Incorrect userId'});
	}
	models.Flow.findAll({
		where: {
			userId: userId
		}
	}).then(flows => {
		if(!flows) {
			return res.status(404).json({success:false, message: 'No Flow'});
		}
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json({success:true, data:flows});
		return res;
	});

});

app.get('/flowsbyUser/graph/:id', (req, res) => {
	const appName = req.params.appName;
	const userId = req.params.id;
	models.sequelize.query("SELECT MONTH(`createdAt`) AS `date`, COUNT(*) AS `countAll` FROM Flows WHERE userId=\'" + userId + "\' GROUP BY `date`")
	.then(function(flows) {
		if(!flows) {
			return res.status(404).json({success:false, message: 'No Flows'});
		}
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json({success:true, data:flows[0]});
		return res;
	});
});


app.get('/flowsbyUser/graph/:appName/:id', (req, res) => {
	const appName = req.params.appName;
	const userId = req.params.id;
	models.sequelize.query("SELECT MONTH(`createdAt`) AS `date`, COUNT(*) AS `countAll` FROM Flows WHERE appName=\'" + appName + "\' and userId=\'" + userId + "\' GROUP BY `date`")
	.then(function(flows) {
		if(!flows) {
			return res.status(404).json({success:false, message: 'No Flows'});
		}
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json({success:true, data:flows[0]});
		return res;
	});
});

app.get('/flows/:appName/:id', (req, res) => {
	const appName = req.params.appName;
	const count = req.params.id;
	models.sequelize.query("SELECT * FROM (SELECT * FROM Flows WHERE appName=\'" + appName + "\' ORDER BY id DESC LIMIT " + count + ") as a order by id asc")
	.then(function(flows) {
		if(!flows) {
			return res.status(404).json({success: false, message: 'No Flows'});
		}
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		return res.json({success: true, data:flows[0]});
	});
});
app.get('/flowsbyUser/:appName/:id', (req, res) => {
	const appName = req.params.appName;
	const userId = req.params.id;

	models.sequelize.query("SELECT * FROM Flows WHERE appName=\'" + appName + "\' and userId=\'" +  userId + "\'")
	.then(function(flows) {
		if(!flows) {
			return res.status(404).json({success: false, message: 'No Flows'});
		}
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		return res.json({success: true, data:flows[0]});
	});
});

app.get('/flows/:id/:startd/:endd', (req, res) => {
	const appName = req.params.id;
	const startDate = req.params.startd;
	const endDate = req.params.endd;

	models.sequelize.query("SELECT * FROM Flows WHERE appName=\'" + appName + "\' and date(createdAt) >= date(" + startDate + ") and date(createdAt) <= date(" + endDate + ")")
	.then(function(flows) {
		if(!flows) {
			return res.status(404).json({success: false, message: 'No Flows'});
		}
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		return res.json({success: true, data:flows});
	});
});
app.get('/flowsbyUser/:appName/:id/:startd/:endd', (req, res) => {
	const appName = req.params.appName;
	const userId = req.params.id;
	const startDate = req.params.startd;
	const endDate = req.params.endd;

	models.sequelize.query("SELECT * FROM Flows WHERE appName=\'" + appName + "\' and userId=\'" + userId + "\' and date(createdAt) >= date(" + startDate + ") and date(createdAt) <= date(" + endDate + ")")
	.then(function(flows) {
		if(!flows) {
			return res.status(404).json({success: false, message: 'No Flows'});
		}
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		return res.json({success: true, data:flows});
	});
});

app.get('/flows/:id/:startd/:endd/:searcht/:eoraName', (req, res) => {
	const appName = req.params.id;
	const startDate = req.params.startd;
	const endDate = req.params.endd;
	const searchType = req.params.searcht;
	const eventOrActionName = req.params.eoraName;

	models.sequelize.query("SELECT * FROM Flows WHERE appName=\'" + appName + "\' and date(createdAt) >= date(" + startDate + ") and date(createdAt) <= date(" + endDate + ") and methodType=" + searchType + " and methodName=" + eventOrActionName)
	.then(function(flows) {
		if(!flows) {
			return res.status(404).json({success: false, message: 'No Flows'});
		}
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		return res.json({success: true, data:flows});
	}); 
});

app.get('/flows/:id/:startd/:endd/:eora', (req, res) => {
	const appName = req.params.id;
	const startDate = req.params.startd;
	const endDate = req.params.endd;
	const eventOrAction = req.params.eora;

	models.sequelize.query("SELECT * FROM Flows WHERE appName=\'" + appName + "\' and date(createdAt) >= date(" + startDate + ") and date(createdAt) <= date(" + endDate + ") and methodType=" + eventOrAction)
	.then(function(flows) {
		if(!flows) {
			return res.status(404).json({success: false, message: 'No Flows'});
		}
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		return res.json({success: true, data:flows});
	});

});

app.get('/flowsbyUser/:appName/:id/:startd/:endd/:eora', (req, res) => {
	const appName = req.params.appName;
	const userId = req.params.id;
	const startDate = req.params.startd;
	const endDate = req.params.endd;
	const eventOrAction = req.params.eora;

	models.sequelize.query("SELECT * FROM Flows WHERE appName=\'" + appName + "\' and userId=\'" + userId + "\' and date(createdAt) >= date(" + startDate + ") and date(createdAt) <= date(" + endDate + ") and methodType=" + eventOrAction)
	.then(function(flows) {
		if(!flows) {
			return res.status(403).json({success: false, message: 'No Flows'});
		}
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		return res.json({success: true, data:flows});
	});

});

app.get('/flowsbyUser/:appName/:id/:searchType', (req, res) => {
	const appName = req.params.appName;
	const userId = req. params.id;
	const searchType = req.params.searchType;

	models.sequelize.query("SELECT * FROM Flows WHERE appName=\'" + appName + "\' and userId=\'" + userId + "\' and methodType=\'" + searchType + "\'")
	.then(function(flows) {
		if(!flows) {
			return res.status(403).json({success: false, message: 'No Flows'});
		}
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		return res.json({success: true, data:flows[0]});
	});

});

app.get('/flowsbyUserFindPattern/:appName/:id/pattern1/:fPattern/pattern2/:pPattern/:num', (req, res) => {
	const appName = req.params.appName;
	const userId = req.params.id;
	const pattern1 = req.params.fPattern;
	const pattern2 = req.params.pPattern;
	const number = req.params.num;
	var type = "";
	var type2 = "";
	if(pattern1.includes("event")) type+="event";
	else if(pattern1.includes("action")) type+="action";
	if(pattern2.includes("event")) type2+="event";
	else if(pattern2.includes("action")) type2+="action";

	var p1 = pattern1.split('|');
	var p2 = pattern2.split('|');
	var pt1Device = [];
	var pt2Device = [];
	var pt1 = [];
	var pt2 = [];

	for(var i in p1) {
		var temp = p1[i].split('=')[1];
		var temp2 = temp.split(',');
		pt1Device.push(temp2[0]);
		pt1.push(temp2[1]);
	}
	for(var i in p2) {
		var temp = p2[i].split('=')[1];
		var temp2 = temp.split(',');
		pt2Device.push(temp2[0]);
		pt2.push(temp2[1]);
	}

	processNextFindingPattern(appName, userId, type, pt1Device, pt1, type2, pt2Device, pt2, number, function(flows) {
		if(flows != null) {
			var returnData = '[' + flows + ']';
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.status(200);
			return res.json({success:true, data: JSON.parse(returnData)});		
		}
		else {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.status(403);
			return res.json({success:false, message:'No Flows'});			
		}
	});

});

async function processNextFindingPattern(appName, userId, type, deviceNames, methodNames, type2, deviceNames2, methodNames2, number, callback) {
	var returnString = "";
	for(var i = 0; i < methodNames.length; i++) {
		findNextPattern1(appName, userId, type, deviceNames[i], methodNames[i], number, function(re) {
			if(re != null) {
				var returnString2  = JSON.stringify({"patternNo": i}) + ",";
				returnString2 += JSON.stringify(re);
				var eOrAId = [];
				eOrAId.push(re.eventOrActionId);
				processNextFindingPattern2(appName, userId, re.id, eOrAId, type2, deviceNames2, methodNames2, function(re2) {
					if(returnString == "") returnString += returnString2 + "," + re2;
					else returnString += "," + returnString2 + "," + re2;
				});
			}
		});
		await delayCall();
	}
	if(returnString.length == "") {
		callback(null);
	}
	else {
		callback(returnString);
	}
}

function findNextPattern1(appName, userId, type, deviceName, methodName, number, callback) {
	models.Flow.findOne({
		where : {
			appName: appName,
			userId: userId,
			methodType: type,
			deviceName: deviceName,
			methodName: methodName,
			id: {
				[Op.lt]: number
			}
		},
		order : [['id', 'DESC']]
	}).then(function(flows) {
		if(!flows) callback(null);
		else {
			callback(flows);
		}
	});
}

async function processNextFindingPattern2(appName, userId, id, eventOrActionId, type, deviceNames, methodNames, callback) {
	var st = "";
	var st2 = "";
	for(var i = 0; i < methodNames.length; i++) {
		findSubPattern2(appName, userId, id, eventOrActionId, type, deviceNames[i], methodNames[i], st, function(re){
			if(re != null) {
				if(st2 == "") {
					var tempst = JSON.stringify({"patternNo2": i}) + ",";
					tempst += re;
				}
				else {
					var tempst = "," + JSON.stringify({"patternNo2": i}) + ",";
					tempst += re;
				}
				st2 += tempst;
			}
		});
		await delayCall2();
	}
	if(st2 == "") {
		callback(null);
	}
	else {
		callback(st2);
	}
}

function findSubPattern2(appName, userId, id, eventOrActionId, methodType, deviceName, methodName, returnString, callback) {
	models.Flow.findOne({
		where : {
			appName: appName,
			userId: userId,
			id: {
				[Op.gt]: id
			},
			dependencyId: {
				[Op.or]: eventOrActionId
			}
		}
	}).then(function(flows) {
		if(!flows) callback(null);
		else  {
			if(returnString == "") returnString = JSON.stringify(flows);
			else returnString = returnString + "," + JSON.stringify(flows);
			if(flows.methodType == methodType && flows.deviceName == deviceName && flows.methodName == methodName) {
				callback(returnString);
			}
			else {
				eventOrActionId.push(flows.eventOrActionId);
				findSubPattern2(appName, userId, flows.id, eventOrActionId, methodType, deviceName, methodName, returnString, callback);
			}
		}
	});
}


app.get('/flowsbyUserFindPattern/:appName/:id/pattern1/:fPattern/pattern2/:pPattern', (req, res) => {
	console.log("pattern search");
	const appName = req.params.appName;
	const userId = req.params.id;
	const pattern1 = req.params.fPattern;
	const pattern2 = req.params.pPattern;

	var type = "";
	var type2 = "";
	if(pattern1.includes("event")) type+="event";
	else if(pattern1.includes("action")) type+="action";
	if(pattern2.includes("event")) type2+="event";
	else if(pattern2.includes("action")) type2+="action";

	var p1 = pattern1.split('|');
	var p2 = pattern2.split('|');
	var pt1Device = [];
	var pt2Device = [];
	var pt1 = [];
	var pt2 = [];
	var depenId;
	var result = [];
	var result2;

	for(var i in p1) {
		var temp = p1[i].split('=')[1];
		var temp2 = temp.split(',');
		pt1Device.push(temp2[0]);
		pt1.push(temp2[1]);
	}
	for(var i in p2) {
		var temp = p2[i].split('=')[1];
		var temp2 = temp.split(',');
		pt2Device.push(temp2[0]);
		pt2.push(temp2[1]);
	}

	processFindingPattern(appName, userId, type, pt1Device, pt1, type2, pt2Device, pt2, function(flows) {
		if(flows != null) {
			var returnData = '[' + flows + ']';
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.status(200);
			return res.json({success:true, data: JSON.parse(returnData)});		
		}
		else {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.status(403);
			return res.json({success:false, message:'No Flows'});			
		}
	});
});

function delay() {
	return new Promise(resolve => setTimeout(resolve, 1000));
}
function delay2() {
	return new Promise(resolve => setTimeout(resolve, 300));
}
async function delayCall() {
	await delay();
}
async function delayCall2() {
	await delay2();
}
async function processFindingPattern(appName, userId, type, deviceNames, methodNames, type2, deviceNames2, methodNames2, callback) {
	var returnString = "";
	for(var i = 0; i < methodNames2.length; i++) {
		findPattern1(appName, userId, type2, deviceNames2[i], methodNames2[i], function(re) {
			if(re != null) {
				//var returnString2  = JSON.stringify({"patternNo": i}) + ",";
				var returnString2 = "";
				returnString2 += JSON.stringify(re);
				var eOrAId = [];
				eOrAId.push(re.eventOrActionId);
				eOrAId.push(re.dependencyId);
				processFindingPattern2(appName, userId, re.id, eOrAId, type, deviceNames, methodNames, function(re2) {
					if(returnString == "" ) returnString += re2 + ","  + returnString2;// + "," + re2;
					else returnString += "," + re2 + "," + returnString2;// + "," + re2;
				});
			}
		});
		await delayCall();
	}
	if(returnString == "") {
		callback(null);
	}
	else {
		callback(returnString);
	}
}

async function processFindingPattern2(appName, userId, id, eventOrActionId, type, deviceNames, methodNames, callback) {
	var st = "";
	var st2 = "";
	for(var i = 0; i < methodNames.length; i++) {
		findSubPattern(appName, userId, id, eventOrActionId, type, deviceNames[i], methodNames[i], st, function(re){
			if(re != null) {
				if(st2 == "") {
					//var tempst = JSON.stringify({"patternNo2": i}) + ",";
					var tempst = "";
					tempst += re;
				}
				else {
					//var tempst = "," + JSON.stringify({"patternNo2": i}) + ",";
					var tempst = ",";
					tempst += re;
				}
				st2 += tempst;
			}
		});
		await delayCall2();
	}
	if(st2 == "") {
		callback(null);
	}
	else {
		callback(st2);
	}
}


function findPattern1(appName, userId, type, deviceName, methodName, callback) {
		models.Flow.findOne({
			where : {
				appName: appName,
				userId: userId,
				methodType: type,
				deviceName: deviceName,
				methodName: methodName
			},
			order : [['id', 'DESC']]
		}).then(function(flows) {
			if(!flows) callback(null);
			else {
				callback(flows);
			}
		});
}

function findSubPattern(appName, userId, id, eventOrActionId, methodType, deviceName, methodName, returnString, callback) {
		models.Flow.findOne({
			where : {
				appName: appName,
				userId: userId,
				id: {
					[Op.lt]: id
				},
				eventOrActionId: {
					[Op.or]: eventOrActionId
				}
			},
			order : [['id', 'DESC']]
		}).then(function(flows) {
			if(!flows) callback(null);
			else  {
				if(returnString == "") returnString = JSON.stringify(flows);
				else returnString = JSON.stringify(flows) + "," + returnString;// + "," + JSON.stringify(flows);
				if(flows.methodType == methodType && flows.deviceName == deviceName && flows.methodName == methodName) {
					callback(returnString);
				}
				else {
					eventOrActionId.push(flows.dependencyId);
					findSubPattern(appName, userId, flows.id, eventOrActionId, methodType, deviceName, methodName, returnString, callback);
				}
			}
		});
}

app.get('/flowsbyUserEorAorM/:appName/:id/:searchType/:methodName', (req, res) => {
	const appName = req.params.appName;
	const userId = req.params.id;
	const searchType = req.params.searchType;
	const methodName = req.params.methodName;

	models.sequelize.query("SELECT * FROM Flows WHERE appName=\'" + appName + "\' and userId=\'" + userId + "\' and methodType=\'" + searchType + "\' and methodName=\'" + methodName + "\'" )
	.then(function(flows) {
		if(!flows) {
			return res.status(403).json({success: false, message: 'No Flows'});
		}
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		return res.json({success: true, data:flows[0]});
	});
});

app.get('/flowsbyUser/:appName/:id/:proveType/:deviceName/:methodName/:datetime', (req, res) => {

	var loop = require('node-while-loop');

	var appName = req.params.appName;
	var userId = req.params.id;
	var proveType = req.params.proveType;
	var deviceName = req.params.deviceName;
	var methodName = req.params.methodName;
	var datetime = req.params.datetime;
	var startDate = new Date(datetime);
	startDate.setSeconds(startDate.getSeconds()-1);
	var endDate = new Date(datetime);
	endDate.setSeconds(endDate.getSeconds()+59);
	var startDateString = startDate.toISOString();
	var endDateString = endDate.toISOString();
	const dateFormat = "\'%Y-%m-%d %T\'";
	const sql_init = "SELECT * FROM Flows WHERE appName=\'" + appName + "\' and userId=\'" + userId + "\'";

	if(proveType == 'whyAction') {
		proveType = 'action';
		var sql = sql_init + " and methodType=\'" + proveType + "\' and deviceName like \'%" + deviceName + "%\' and methodName=\'" + methodName + "\'";
		sql += " and date_format(createdAt, " + dateFormat + ") >= date_format(\'" + startDateString + "\', " + dateFormat + ")"
		sql += " and date_format(createdAt, " + dateFormat + ") <= date_format(\'" + endDateString + "\', " + dateFormat + ")";
	
		query(sql, function(re) {
			if(re == null) {
				res.status(404).json({success: false, data: 'No Flows'});
			}
			else {
				var result = JSON.stringify(re);
				result = result.substring(1, result.length-1);
				sql = sql_init + " and eventOrActionId=\'" + re[0].dependencyId + "\' and id < " + re[0].id  + " order by id desc limit 1";
				query1(sql, "", function(returnSt) {
					if(returnSt == "") {
						result = "[" + result + "]";
						var returnData = JSON.parse(result);
						res.setHeader('Access-Control-Allow-Origin', '*');
						res.status(200);
						return res.json({success: true, data: returnData});
					}
					else {
						result = "[" + result + "," + returnSt + "]";
						var returnData = JSON.parse(result);
						res.setHeader('Access-Control-Allow-Origin', '*');
						res.status(200);
						return res.json({success: true, data: returnData});
					}
				});

			}
		});
	}
	else if(proveType == 'whyEvent') {
		proveType = 'event';

		var sql = sql_init + " and methodType=\'" + proveType + "\' and deviceName like \'%" + deviceName + "%\' and methodName=\'" + methodName + "\'";
		sql += " and date_format(createdAt, " + dateFormat + ") >= date_format(\'" + startDateString + "\', " + dateFormat + ")"
		sql += " and date_format(createdAt, " + dateFormat + ") <= date_format(\'" + endDateString + "\', " + dateFormat + ")";
		
		query(sql, function(re) {
			if(re == null) {
				res.status(404).json({success: false, data: 'No Flows'});
			}
			else {
				var result = JSON.stringify(re);
				result = result.substring(1, result.length-1);
				sql = sql_init + " and eventOrActionId like \'%" + re[0].dependencyId + "%\' and id < " + re[0].id + " order by id desc limit 1";
				query1(sql, "", function(returnSt) {
					if(returnSt == "") {
						result = "[" + result + "]";
						var returnData = JSON.parse(result);
						res.setHeader('Access-Control-Allow-Origin', '*');
						res.status(200);
						return res.json({success: true, data: returnData});
					}
					else {
						result = "[" + result + "," + returnSt + "]";
						var returnData = JSON.parse(result);
						res.setHeader('Access-Control-Allow-Origin', '*');
						res.status(200);
						return res.json({sucess: true, data: returnData});
					}
				});
			}
		});

	}
	else if(proveType == "whatAction") {
		proveType = 'event';

		var sql = sql_init + " and methodType=\'" + proveType + "\' and deviceName like \'%" + deviceName + "%\' and methodName=\'" + methodName + "\'";
		sql += " and date_format(createdAt, " + dateFormat + ") >= date_format(\'" + startDateString + "\', " + dateFormat + ")";
		sql += " and date_format(createdAt, " + dateFormat + ") <= date_format(\'" + endDateString + "\', " + dateFormat + ")";

		query(sql, function(re) {
			if(re == null) {
				res.status(404).json({success: false, data: 'No Flows'});
			}
			else {
				var result = JSON.stringify(re);
				result = result.substring(1, result.length-1);
				sql = sql_init + " and dependencyId like \'%" + re[0].dependencyId + "%\' and id > " + re[0].id + " limit 1";
				query5_3(sql, "", function(returnSt) {
					if(returnSt == "") {
						result = "[" + result + "]";
						var resturnData = JSON.parse(result);
						res.setHeader('Access-Control-Allow-Origin', '*');
						res.status(200);
						return res.json({success: true, data: returnData});
					}
					else {
						result = "[" + result + "," + returnSt + "]";
						var returnData = JSON.parse(result);
						res.setHeader('Access-Control-Allow-Origin', '*');
						res.status(200);
						return res.json({success: true, data: returnData});
					}
				});
			}
		});

	}

	if(proveType == 'whatEvent') {
		proveType = 'action';
		
		var sql = sql_init + " and methodType=\'" + proveType + "\' and deviceName like \'%" + deviceName + "%\' and methodName=\'" + methodName + "\'";
		sql += " and date_format(createdAt, " + dateFormat + ") >= date_format(\'" + startDateString + "\', " + dateFormat + ")"
		sql += " and date_format(createdAt, " + dateFormat + ") <= date_format(\'" + endDateString + "\', " + dateFormat + ")";

		query(sql, function(re) {
			if(re == null) {
				res.status(404).json({success: false, data: 'No Flows'});
			}
			else {
				var result = JSON.stringify(re);
				result = result.substring(1, result.length-1);
				var eaid = re[0].eventOrActionId;
				if(eaid.includes("[") && eaid.includes("]"))
					eaid = eaid.substring(1, eaid.length-1);
				sql = sql_init + " and dependencyId=\'" + eaid + "\' and id > " + re[0].id + " limit 1";
				query5_1(sql, "", function(returnSt) {
					if(returnSt == "") {
						result = "[" + result + "]";
						var returnData = JSON.parse(result);
						res.setHeader('Access-Control-Allow-Origin', '*');
						res.status(200);
						return res.json({success: true, data: returnData});
					}
					else {
						result = "[" + result + "," + returnSt + "]";
						var returnData = JSON.parse(result);
						res.setHeader('Access-Control-Allow-Origin', '*');
						res.status(200);
						return res.json({success: true, data: returnData});
					}
				});

			}
		});
	}
});

function query(sql, callback) {
	models.sequelize.query(sql)
	.then(function(flows) {
		if(!flows) return callback(null);
		else return callback(flows[0]);
	});
}

function query1(sql, returnString, callback) {
	models.sequelize.query(sql)
	.then(function(flows) {
		if(flows[0].length < 1) {
			return callback(returnString);
		}
		else {
			var result = JSON.stringify(flows[0]);
			result = result.substring(1, result.length-1);
			if(returnString == "") returnString = result;
			else returnString = returnString + "," + result;
			var data = flows[0];
			var eaid = data[0].dependencyId;
			var sql1 = "";
			if(data[0].methodType == "handlerMethod")
				sql1 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and eventOrActionId=\'" + data[0].eventOrActionId + "\' and id < " + data[0].id + " order by id desc limit 1";
			else
				var sql1 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and eventOrActionId=\'" + eaid + "\' and id < " + data[0].id + " order by id desc limit 1";
			query1(sql1, returnString, callback);
		}
	});
}

function query2(sql, returnString, callback) {
	models.sequelize.query(sql)
	.then(function(flows) {
		if(!flows) return callback(returnString);
		if(flows[0].length < 1) return callback(returnString);
		else {
			var result = JSON.stringify(flows[0]);
			result = result.substring(1, result.length-1);
			if(returnString == "") returnString = result;
			else returnString = returnString + "," + result;
			var data = flows[0];
			var eaid = data[0].dependencyId;
			var sql1 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and eventOrActionId LIKE \'%" + eaid + "%\' order by id desc limit 1";
			models.sequelize.query(sql1)
			.then(function(flows2) {
				if(flows2[0].length < 1) return callback(returnString);
				else {
					var result2 = JSON.stringify(flows2[0]);
					result2 = result2.substring(1, result2.length-1);
					returnString = returnString + "," + result2;
					var data = flows2[0]
					var eaid = data[0].dependencyId;
					var sql2 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and eventOrActionId=\'" + eaid + "\' order by id desc limit 1";
					query2(sql2, returnString, callback);
				}
			});

		}
	});	
}

function query3(sql, returnString, callback) {
	models.sequelize.query(sql)
	.then(function(flows) {
		if(flows[0].length < 1) return callback(returnString);
		else {
			var result = JSON.stringify(flows[0]);
			result = result.substring(1, result.length-1);
			if(returnString == "") returnString = result;
			else returnString = returnString + "," + result;
			var data = flows[0];
			var eaid = data[0].dependencyId;
			if(eaid.includes("[") && eaid.includes("]"))
				eaid = eaid.substring(1, eaid.length-1);
			var sql1 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and methodType=\'event\' and eventOrActionId=\'" + eaid + "\'";
			models.sequelize.query(sql1)
			.then(function(flows2) {
				if(flows2[0].length < 1) return callback(returnString);
				else {
					var result2 = JSON.stringify(flows2[0]);
					result2 = result2.substring(1, result2.length-1);
					returnString = returnString + "," + result2;
					var data = flows2[0];
					var eaid = data[0].dependencyId;
					var sql2 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and methodType=\'action\' and eventOrActionId LIKE \'%" + eaid + "%\'";
					query3(sql2, returnString, callback);
				}
			});
		}
	});
}

function query4(sql, returnString, callback){
	models.sequelize.query(sql)
	.then(function(flows) {
		if(flows[0].length < 1) return callback(returnString);
		else {
			var result = JSON.stringify(flows[0]);
			result = result.substring(1, result.length-1);
			if(returnString == "") returnString = result;
			else returnString = returnString + "," + result;
			var data = flows[flows.length-1];
			var eaid = data[0].eventOrActionId;
			if(eaid.includes("[") && eaid.includes("]"))
				eaid = eaid.substring(1, eaid.length-1);
			var sql1 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and methodType=\'event\' and dependencyId=\'" + eaid + "\'";
			models.sequelize.query(sql1)
			.then(function(flows2) {
				if(flows2[0].length < 1) return callback(returnString);
				else {
					var result2 = JSON.stringify(flows2[0]);
					result2 = result2.substring(1, result2.length-1);
					returnString = returnString + "," + result2;
					var data = flows2[flows2.length-1];
					var eaid = data[0].eventOrActionId;
					if(eaid.includes("[") && eaid.includes("]"))
						eaid = eaid.substring(1, eaid.length-1);
					var sql2 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and methodType=\'action\' and dependencyId=\'" + eaid + "\'";
					query4(sql2, returnString, callback);
				}

			});

		}

	});
}

function query5(sql, returnString, callback) {
	models.sequelize.query(sql)
	.then(function(flows) {
		if(flows[0].length < 1) return callback(returnString);
		else {
			var result = JSON.stringify(flows[0]);
			result = result.substring(1, result.length-1);
			if(returnString == "") returnString = result;
			else returnString = returnString + "," + result;
			var data = flows[flows.length-1];
			var eaid = data[0].eventOrActionId;
			if(eaid.includes("[") && eaid.includes("]"))
				eaid = eaid.substring(1, eaid.length-1);
			var sql1 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and methodType=\'action\' and dependencyId=\'" + eaid + "\'";
			models.sequelize.query(sql1)
			.then(function(flows2) {
				if(flows2[0].length < 1) return callback(returnString);
				else {
					var result2 = JSON.stringify(flows2[0]);
					result2 = result2.substring(1, result2.length-1);
					returnString = returnString + "," + result2;
					var data = flows2[flows2.length-1];
					var eaid = data[0].eventOrActionId;
					if(eaid.includes("[") && eaid.includes("]"))
						eaid = eaid.substring(1, eaid.length-1);
					var sql2 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and methodType=\'event\' and dependencyId=\'" + eaid + "\'";
					query5(sql2, returnString, callback);
				}
			});

		}
	});
}
function query5_1(sql, returnString, callback) {
	models.sequelize.query(sql)
	.then(function(flows) {
		if(flows[0].length < 1) {
			return callback(returnString);
		}
		else {
			var result = JSON.stringify(flows[0]);
			result = result.substring(1, result.length-1);
			if(returnString == "") returnString = result;
			else returnString = returnString + "," + result;
			var data = flows[0];
			var eaid = data[0].eventOrActionId;
			var sql1 = "";
			if(data[0].methodType == "event")
				sql1 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and dependencyId=\'" + data[0].dependencyId + "\' and id > " + data[0].id + " limit 1";
			else
				sql1 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and dependencyId=\'" + eaid + "\' and id > " + data[0].id + " limit 1";
			query5_1(sql1, returnString, callback);
		}
	});
}

function query5_3(sql, returnString, callback) {
	models.sequelize.query(sql)
	.then(function(flows) {
		if(flows[0].length < 1) {
			return callback(returnString);
		}
		else {
			var result = JSON.stringify(flows[0]);
			result = result.substring(1, result.length-1);
			if(returnString == "") returnString = result;
			else returnString = returnString + "," + result;
			var data = flows[0];
			var eaid = data[0].eventOrActionId;
			var sql1 = "";
			/*if(data[0].methodType == "action") {
				console.log("query5_2");
				var sql2 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and dependencyId=\'" + data[0].dependencyId + "\' and id > " + data[0].id + " limit 1";
				query5_2(sql2, "", function(flows2) {
					var result = JSON.stringify(flows2[0]);
					result = result.substring(1, result.length-1);
					if(returnString == "") returnString = result;
					else returnString = returnString + "," + result;
					console.log(returnString);
				});
			}*/
			if(data[0].methodType == "event") {
				sql1 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and dependencyId=\'" + data[0].dependencyId + "\' and id > " + data[0].id + " limit 1";
				query5_3(sql1, returnString, callback);
			}
			else if(data[0].methodType == "handlerMethod" || data[0].methodType == "methodCall") {
				/*query5_4(data[0].appName, data[0].userId, data[0].id, data[0].eventOrActionId, function(re) {
					var result2 = re.substring(1, re.length-1);
					if(returnString == "") returnString = result2;
					else returnString = returnString + "," + result2;
				});*/
				sql1 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and dependencyId=\'" + data[0].eventOrActionId + "\' and id > " + data[0].id;
				query5_3(sql1, returnString, callback);
			}
			else {
				sql1 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and dependencyId=\'" + data[0].eventOrActionId + "\' and id > " + data[0].id + " limit 1";
				query5_3(sql1, returnString, callback);
			}
			//query5_3(sql1, returnString, callback);
		}
	});
}

 async function query5_4(appName, userId, id, eventOrActionId, callback) {
	models.Flow.findAll({
		where : {
			appName: appName,
			userId: userId,
			methodType: "action",
			id: {
				[Op.gt]: id
			},
			dependencyId: {
				[Op.or]: eventOrActionId
			}
		}
	}).then(function(flows) {
		if(!flows) callback(null);
		else  {
			callback(JSON.stringify(flows));
		}
	});
	await delayCall();
}

function query5_2(sql, returnString, callback) {
	models.sequelize.query(sql)
	.then(function(flows) {
		if(flows[0].length < 1) {
			return callback(returnString);
		}
		else {
			var result = JSON.stringify(flows[0]);
			result = result.substring(1, result.length-1);
			if(returnString == "") returnString = result;
			else returnString = returnString + "," + result;
			var data = flows[0];
			var eaid = data[0].eventOrActionId;
			var sql1 = "";
			if(data[0].methodType == "event")
				sql1 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and dependencyId=\'" + data[0].dependencyId + "\' and id > " + data[0].id + " limit 1";
			else
				sql1 = "SELECT * FROM Flows WHERE appName=\'" + data[0].appName + "\' and userId=\'" + data[0].userId + "\' and dependencyId=\'" + eaid + "\' and id > " + data[0].id + " limit 1";
			query5_2(sql1, returnString, callback);
		}
	});
}

app.post('/flows', (req, res) => {
	const appName = req.body.appName || '';
	const userId = req.body.userId || '';
	const methodName = req.body.methodName || '';
	const capability = req.body.capability || '';
	var deviceName = req.body.deviceName || '';
	const methodType = req.body.methodType || '';
	var eventOrActionId = req.body.eventOrActionId || '';
	var dependencyId = req.body.dependencyId || '';

	if(!appName.length) {
		return res.status(400).json({error: 'Incorrect appName'});
	}
	if(!methodName.length) {
		return res.status(400).json({error: 'Incorrect methodName'});
	}
	if(!capability.length) {
		return res.status(400).json({error: 'Incorrect capability'});
	}
	if(!deviceName.length) {
		return res.status(400).json({error: 'Incorrect deviceName'});
	} else {
		if(deviceName.includes('[')) deviceName = deviceName.substring(1, deviceName.length-1);
	}
	if(!methodType.length) {
		return res.status(400).json({error: 'Incorrect methodType'});
	}
	if(eventOrActionId.includes('[')) eventOrActionId = eventOrActionId.substring(1, eventOrActionId.length-1);
	if(dependencyId.includes('[')) dependencyId = dependencyId.substring(1, dependencyId.length-1);
	
	io.to(userId).emit('send data event', {appName, methodName, capability, deviceName, methodType, eventOrActionId, dependencyId});
	
	models.Flow.create({
		appName: appName,
		userId: userId,
		methodName: methodName,
		capability: capability,
		deviceName: deviceName,
		methodType: methodType,
		eventOrActionId: eventOrActionId,
		dependencyId: dependencyId
	}).then((flow) => res.status(201).json(flow))
});

app.get('/smartapps', (req, res) => {
	models.sequelize.query("SELECT * FROM SmartApps ORDER BY appName")
		.then(function(smartapps) {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.status(200);
			res.json({success:true, data:smartapps[0]});
		}).catch(function(err) {
			res.status(500);
			res.json({success:false, message:err});
		});
});

app.get('/smartapps/:id', (req, res) => {
	const id = req.params.id;
	console.log(id);
	models.sequelize.query("SELECT * FROM SmartApps WHERE userId=\"" + id + "\" ORDER BY appName")
	.then(function(smartapps) {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json({success:true, data:smartapps[0]});
	}).catch(function(err) {
		res.status(500);
		res.json({success:false, message:err});
	});
});

app.post('/smartapps', (req, res) => {
	const appName = req.body.appName || '';
	const userId = req.body.userId || '';
	const detail = req.body.detail || '';

	if(!appName.length) {
		return res.status(400).json({error: 'Incorrect appName'});
	}

	models.SmartApp.create({
		appName: appName,
		userId: userId,
		detail: detail
	}).then((smartapp) => res.status(201).json(smartapp))
});

app.get('/events', (req, res) => {
	models.Flow.findAll({
		where: {
			methodType: 'event'
		}
	}).then(flows => {
		if(!flows) {
			return res.status(404).json({success:false, message: 'No Events'});
		}
		
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json(flows);
		return res;
	});
});

app.get('/events/:id', (req, res) => {
	const appName = req.params.id;
	console.log(appName);
	
	if(!appName.length) {
		return res.status(400).json({error: 'Incorrect appName'});
	}
	
	models.Flow.findAll({
		where: {
			methodType: 'event',
			appName: appName
		}
	}).then(flows => {
		if(!flows) {
			return res.status(404).json({success:false, message: 'No Events'});
		}
		
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json({success:true, data:flows});
		return res;
	});
});

app.get('/events/:appName/:userId', (req, res) => {
	const appName = req.params.appName;
	const userId = req.params.userId; 
	
	if(!appName.length) {
		return res.status(400).json({error: 'Incorrect appName'});
	}
	
	models.Flow.findAll({
		where: {
			methodType: 'event',
			appName: appName,
			userId: userId
		}
	}).then(flows => {
		if(!flows) {
			return res.status(404).json({success:false, message: 'No Events'});
		}
		
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json({success:true, data:flows});
		return res;
	});
});


app.get('/events/:id/:startd/:endd', (req, res) => {
	const appName = req.params.id;
	const startDate = req.params.startd;
	const endDate = req.params.endd;
 
	models.sequelize.query("SELECT * FROM Flows WHERE appName=\'" + appName + "\' and methodType=\'event\' and date(createdAt) >= date(" + startDate + ") and date(createdAt) <= date(" + endDate + ")")
	.then(function(flows){
		if(!flows) {
			return res.status(404).json({success: false, message: 'No Events'});
		}
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json({success:true, data:flows});
		return res;
	});
});

app.get('/actions', (req, res) => {
	models.Flow.findAll({
		where: {
			methodType: 'action'
		}
	}).then(flows => {
		if(!flows) {
			return res.status(404).json({success:false, message: 'No Actions'});
		}
		
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json(flows);
		return res;
	});
});

app.get('/actions/:id', (req, res) => {
	const appName = req.params.id;
	
	if(!appName.length) {
		return res.status(400).json({error: 'Incorrect appName'});
	}
	
	models.Flow.findAll({
		where: {
			methodType: 'action',
			appName: appName
		}
	}).then(flows => {
		if(!flows) {
			return res.status(404).json({success:false, message: 'No Actions'});
		}
		
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json({success:true, data:flows});
		return res;
	});
});

app.get('/actions/:appName/:userId', (req, res) => {
	const appName = req.params.appName;
	const userId = req.params.userId;
	
	if(!appName.length) {
		return res.status(400).json({error: 'Incorrect appName'});
	}
	
	models.Flow.findAll({
		where: {
			methodType: 'action',
			appName: appName,
			userId: userId
		}
	}).then(flows => {
		if(!flows) {
			return res.status(404).json({success:false, message: 'No Actions'});
		}
		
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json({success:true, data:flows});
		return res;
	});
});

app.get('/actions/:id/:startd/:endd', (req, res) => {
	const appName = req.params.id;
	const startDate = req.params.startd;
	const endDate = req.params.endd;

	models.sequelize.query("SELECT * FROM Flows WHERE appName=\'" + appName + "\' and methodType=\'action\' and date(createdAt) >= date(" + startDate + ") and date(createdAt) <= date(" + endDate + ")")
	.then(function(flows){
		if(!flows) {
			return res.status(404).json({success: false, message: 'No Actions'});
		}
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json({success:true, data:flows});
		return res;
	});

});

app.get('/devices', (req, res) => {
	models.Flow.findAll({
		attributes: ['appName', 'deviceName']
	}).then(flows => {
		if(!flows) {
			return res.status(404).json({success:false, message: 'No devices'});
		}
		
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json({success:true, data:flows});
		return res;
	});
});

app.get('/capabilities', (req, res) => {
	models.Capabilities.findAll()
		.then(function(capabilities) {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.status(200);
			res.json({success: true, data: capabilities});
		}).catch(function(err) {
			res.status(500);
			res.json({success:false, message:err});
		});
});

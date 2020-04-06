const express = require('express');
const bodyParser = require('body-parser');
const fs = require("fs");
const Op = require('sequelize').Op;
const models = require('./models');
const app = express();
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const server = app.listen(3030, () => {
    console.log('Example app listening on port 3030!');

    models.sequelize.sync()
    .then(() => {
        console.log('Databases sync');
    });
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

app.get('/smartapps/:id', (req, res) => {
	const id = req.params.id;
	models.sequelize.query("SELECT * FROM SmartApps WHERE userId=\"" + id + "\" and detail != '' and detail IS NOT NULL ORDER BY appName")
	.then(function(smartapps) {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json({success:true, data:smartapps[0]});
	}).catch(function(err) {
		res.status(500);
		res.json({success:false, message:err});
	});
});

app.get('/smartApps/:id/:appName', (req, res) => {
	const id = req.params.id;
	const appName = req.params.appName;

	models.sequelize.query("SELECT * FROM SmartApps WHERE userId=\"" + id + "\" and appName=\"" + appName + "\"")
	.then(function(smartapp) {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(200);
		res.json({success:true, data:smartapp[0]});
	}).catch(function(err) {
		res.status(500);
		res.json({sucess:false, message:err});
	});
});

app.get('/flows/:appName/:id', (req, res) => {
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

app.get('/searchPatterns/:appName/:id/from/:fp/to/:tp/:num', (req, res) => {
	const appName = req.params.appName;
	const userId = req.params.id;
	const fps = req.params.fp;
	const tps = req.params.tp;
	const number = req.params.num;
	
	var ftype = "";
	var ttype = "";
	if(fps.includes("event")) ftype+="event";
	else if(fps.includes("action")) ftype+="action";
	if(tps.includes("event")) ttype+="event";
	else if(tps.includes("action")) ttype+="action";

	var fpList1 = fps.split('|');
	var tpList1 = tps.split('|');
	var fpDevice = [];
	var tpDevice = [];
	var fpList2 = [];
	var tpList2 = [];

	for(var i in fpList1) {
		var temp = fpList1[i].split('=')[1];
		var temp2 = temp.split(',');
		fpDevice.push(temp2[0]);
		fpList2.push(temp2[1]);
	}
	for(var i in tpList1) {
		var temp = tpList1[i].split('=')[1];
		var temp2 = temp.split(',');
		tpDevice.push(temp2[0]);
		tpList2.push(temp2[1]);
	}

	processNextFindingPattern(appName, userId, ftype, fpDevice, fpList2, ttype, tpDevice, tpList2, number, function(flows) {
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
	//await delayCall2();

});

async function processNextFindingPattern(appName, userId, ftype, fpDevice, fpList2, ttype, tpDevice, tpList2, number, callback) {
	var returnString = "";
	for(var i = 0; i < fpList2.length; i++) {
		findNextPattern1(appName, userId, ftype, fpDevice[i], fpList2[i], number, function(re) {
			if(re != null) {
				//var returnString2  = JSON.stringify({"patternNo": i}) + ",";
				var returnString2 = "";
				returnString2 += JSON.stringify(re);
				var eOrAId = [];
				eOrAId.push(re.eventOrActionId);
				processFindingPattern2(appName, userId, re.id, eOrAId, ttype, tpDevice, tpList2, function(re2) {
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

function findNextPattern1(appName, userId, ftype, fpDevice, fp, number, callback) {
	models.Flow.findOne({
		where : {
			appName: appName,
			userId: userId,
			methodType: ftype,
			deviceName: fpDevice,
			methodName: fp,
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

app.get('/searchPatterns/:appName/:id/from/:fp/to/:tp', async function (req, res) {
    //console.log('search patterns');
	const appName = req.params.appName;
	const userId = req.params.id;
	const fps = req.params.fp;
	const tps = req.params.tp;

	var ftype = "";
	var ttype = "";
	if(fps.includes("event")) ftype+="event";
	else if(fps.includes("action")) ftype+="action";
	if(tps.includes("event")) ttype+="event";
	else if(tps.includes("action")) ttype+="action";

	var fpList1 = fps.split('|');
	var tpList1 = tps.split('|');
	var fpDevice = [];
	var tpDevice = [];
    var fpList2 = [];
    var tpList2 = [];



	for(var i in fpList1) {
		var temp = fpList1[i].split('=')[1];
		var temp2 = temp.split(',');
		fpDevice.push(temp2[0]);
        fpList2.push(temp2[1]);
	}
	for(var i in tpList1) {
		var temp = tpList1[i].split('=')[1];
		var temp2 = temp.split(',');
		tpDevice.push(temp2[0]);
        tpList2.push(temp2[1]);
	}

	//getDeviceMap(appName, userId, fpDevice, tpDevice); await delayCall2();

	processFindingPattern(appName, userId, ftype, fpDevice, fpList2, ttype, tpDevice, tpList2, function(flows) {
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
	await delayCall2();
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

/*async function getDeviceMap(appName, userId, fpDevice, tpDevice) {
	models.SmartApp.findOne({
		where :{
			appName: appName,
			userId: userId
		}
	}).then(function(smartapp) {
		if(!smartapp) {
			console.log("there is not the smartapp");
		}
		else {
			for(var i in fpDevice) {
				if(String(smartapp.dataValues.detail).includes(fpDevice[i])) {
					var temp = smartapp.dataValues.detail;
					var temp2 = temp.substring(temp.indexOf(fpDevice[i])+fpDevice[i].length+1);
					var temp3 = temp2.substring(0, temp2.indexOf(','));
					fpDevice[i] = temp3;
				}
			}
			for(var j in tpDevice) {
				if(String(smartapp.dataValues.detail).includes(tpDevice[j])) {
					var temp = smartapp.dataValues.detail;
					var temp2 = temp.substring(temp.indexOf(tpDevice[j])+fpDevice[j].length+1);
					var temp3 = temp2.substring(0, temp2.indexOf(','));
					fpDevice[j] = temp3;
				}				
			}
		}
	});
}*/

/*String.prototype.replaceAll = function(org, dest) {
    return this.split(org).join(dest);
}*/

async function processFindingPattern(appName, userId, ftype, fpDevice, fpList2, ttype, tpDevice, tpList2, callback) {
	var returnString = "";
	for(var i = 0; i < fpList2.length; i++) {
		findPattern1(appName, userId, ftype, fpDevice[i], fpList2[i], function(re) {
			if(re != null) {
                //var returnString2  = JSON.stringify({"patternNo": i}) + ",";
                var returnString2 = "";
				returnString2 += JSON.stringify(re);
				var eOrAId = [];
				eOrAId.push(re.eventOrActionId);
				eOrAId.push(re.dependencyId);
				processFindingPattern2(appName, userId, re.id, eOrAId, ttype, tpDevice, tpList2, function(re2) {
					if(returnString == "" ) returnString += returnString2 + "," + re2;
					else returnString += "," + returnString2 + "," + re2;
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

function findPattern1(appName, userId, ftype, fpDevice, fp, callback) {
    models.Flow.findOne({
        where : {
            appName: appName,
            userId: userId,
			methodType: ftype,
			deviceName: fpDevice,
            methodName: fp
        },
        order : [['id', 'DESC']]
    }).then(function(flows) {
        if(!flows) callback(null);
        else {
            callback(flows);
        }
    });
}

async function processFindingPattern2(appName, userId, id, eventOrActionId, ttype, tpDevice, tpList2, callback) {
	var st = "";
	var st2 = "";
	for(var i = 0; i < tpList2.length; i++) {
		findSubPattern(appName, userId, id, eventOrActionId, ttype, tpDevice[i], tpList2[i], st, function(re){
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

function findSubPattern(appName, userId, id, eventOrActionId, ttype, tpDevice, tp, returnString, callback) {
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
            if(flows.methodType == ttype && flows.deviceName == tpDevice && flows.methodName == tp) {
                callback(returnString);
            }
            else {
                eventOrActionId.push(flows.eventOrActionId);
                findSubPattern(appName, userId, flows.id, eventOrActionId, ttype, tpDevice, tp, returnString, callback);
            }
        }
    });
}

app.get('/searchProve/:appName/:id/:proveType/:deviceName/:methodName/:datetime', (req, res) => {

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

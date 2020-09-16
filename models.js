const DBcon = require('./config')
const Sequelize = require('sequelize');
const DBConnect = DBcon.DBcon;
const sequelize = new Sequelize(
	DBConnect.dbname,
	DBConnect.user,
	DBConnect.passwd, {
	'host': DBConnect.host,
	'port': DBConnect.port,
	'dialect': 'mysql',

	'pool': {
		'max': 5,
		'min': 0,
		'acquire': 30000,
		'idle': 10000
	},

	'operatorsAliases': false
});

const Flow = sequelize.define('Flow', {
	appName: Sequelize.STRING,
	userId: Sequelize.STRING,
	methodName: Sequelize.STRING,
	capability: Sequelize.STRING,
	deviceName: Sequelize.STRING,
	methodType: Sequelize.STRING,
	eventOrActionId: Sequelize.STRING,
	dependencyId: Sequelize.STRING
});

const SmartApp = sequelize.define('SmartApp', {
	appName: Sequelize.STRING,
	userId: Sequelize.STRING,
	detail: Sequelize.STRING
});

const Capabilities = sequelize.define('Capabilities', {
	capability: Sequelize.STRING,
	action: Sequelize.STRING
});

const AirPurifierData = sequelize.define('AirPurifierData', {
	outAirQuality: Sequelize.INTEGER,
	outPM10: Sequelize.INTEGER,
	inAirQuality: Sequelize.FLOAT,
	airPurifierState: Sequelize.STRING
});

const AirPurifierData2 = sequelize.define('AirPurifierData2', {
	outAirQuality: Sequelize.INTEGER,
	outPM10: Sequelize.INTEGER,
	inAirQuality: Sequelize.FLOAT,
	airPurifierState: Sequelize.STRING

});

const TemperatureData = sequelize.define('TemperatureData', {
	outTemperature: Sequelize.FLOAT,
	inTemperature: Sequelize.FLOAT
});

const DustData = sequelize.define('DustData', {
	dustValue: Sequelize.FLOAT
});

const Users = sequelize.define('Users', {
	userId: Sequelize.STRING,
	password: Sequelize.STRING
});

module.exports = {
	sequelize: sequelize,
	Flow: Flow,
	SmartApp: SmartApp,
	Capabilities: Capabilities,
	AirPurifierData: AirPurifierData,
	AirPurifierData2: AirPurifierData2,
	TemperatureData: TemperatureData,
	DustData: DustData,
	Users: Users
}

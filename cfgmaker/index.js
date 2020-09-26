const dns = require("dns");
const fs = require("fs");
const exec = require("child_process").exec;
const winston = require("winston");
var express = require("express");

const logger = winston.createLogger({
	level: "info",
	format: winston.format.json(),
	transports: [new winston.transports.Console()]
});

var app = express();

const config = `
ScoreboardFile /var/proftpd/proftpd.scoreboard

LoadModule mod_proxy.c

<IfModule mod_proxy.c>
        ProxyEngine on
        ProxyLog /var/log/ftpproxy.log
        ProxyTables /var/ftp/proxy

        ProxyRole reverse
        ProxyReverseConnectPolicy LeastConns
        ProxyDataTransferPolicy EPSV
	ProxyReverseServers %BACKENDS%
</IfModule>
`;

var serviceHost = "";
var sleepTime = 60000;
var currentConfig = "";
var haveConfig = false;
var numFailures = 0;

// perform lookup of SRV records
async function lookup(host) {
	return new Promise((resolve, reject) => {
		dns.resolveSrv(host, (err, records) => {
			if(err) reject(err);
			resolve(records);
		});
	});
}

// update config
// and then set a timer to do it again
async function continuousRefresh() {
	// get the dns details
	try {
		var backends = "";
		const records = await lookup(serviceHost);
		records.forEach((item, index) => {
			backends = backends + "ftp://" + item.name + ":" + item.port + " ";
		});
		var newConfig = config.replace(/%BACKENDS%/, backends);
		if(currentConfig == newConfig) {
			logger.info("No config change detected");
		} else {
			logger.info("Config has changed, reloading proftpd...");
			currentConfig = newConfig;
			fs.writeFileSync("/etc/proftpd.conf", newConfig);
			exec("killall -1 proftpd").unref();
		}
		haveConfig = true;
		numFailures = 0;
		setTimeout(continuousRefresh, sleepTime);
	} catch(err) {
		logger.error("Hit error while trying to get SRV record");
		logger.error(err);
		if(!haveConfig) {
			logger.error("Exiting as we've not been able to create a config");
			process.exit(1);
		}
		numFailures++;
		setTimeout(continuousRefresh, sleepTime);
	}
}

// run the application
async function run() {
	logger.info("Starting cfgmaker for proftpd reverse proxy...");
	if("SRV_RECORD" in process.env) {
		logger.info("Got SRV record name of: " + process.env.SRV_RECORD);
		serviceHost = process.env.SRV_RECORD;
	} else {
		logger.error("Expecting SRV_RECORD environment variable");
		process.exit(1);
	}
	if("REFRESH_RATE" in process.env) {
		logger.info("Got REFRESH_RATE of " + process.env.REFRESH_RATE + " seconds");
		sleepTime = parseInt(process.env.REFRESH_RATE, 10) * 1000;
	} else {
		logger.warn("Expecting REFRESH_RATE environment variable, setting default of 60 seconds.");
		sleepTime = 60000;
	}
	continuousRefresh();
}


// need to provide monitoring endpoint
app.get("/", (req, res) => {
	logger.info("Call for status");
	if(numFailures > 2) {
		logger.info("Returning 500 failure");
		res.status(500).json({
			numFailures: numFailures,
			down: true
		})
	} else {
		logger.info("Returning 200 okay");
		res.status(200).json({
			numFailures: numFailures,
			down: false
		});
	}
});
app.listen(3000);

// call run routine
run();

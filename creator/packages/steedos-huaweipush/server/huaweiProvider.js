const request = require('requestretry');
const tokenUrl = "https://oauth-login.cloud.huawei.com/oauth2/v3/token";
const apiUrl = "https://push-api.cloud.huawei.com/v1/[clientid]/messages:send";
const timeout = 5000;

HuaweiPush = {
	authInfo: {},
	default_package_name: undefined,
	debug: Meteor.settings.push && Meteor.settings.push.huawei && Meteor.settings.push.huawei.debug
};

HuaweiPush.config = function(config) {
	config.forEach((val) => {
		if (this.authInfo[val.package_name])
			return
		this.authInfo[val.package_name] = val;
		val.access_token_expire = 0;
		if (!this.default_package_name) {
			this.default_package_name = val.package_name;
			if (HuaweiPush.debug)
				console.info('huawei default package name ', this.default_package_name);
		}
	});
}

HuaweiPush.sendMany = function(notification, tokenDataList, timeToLive) {
	if (notification.android.title) {
		const mapTokenData = {};
		for (const tokenData of tokenDataList) {
			const package_name = tokenData.package_name || this.default_package_name;
			if (!this.authInfo[package_name]) {
				console.error('huawei package name not supported: ', package_name);
				continue;
			}
			const tokenList = mapTokenData[package_name] || [];
			tokenList.push(tokenData.token);
			mapTokenData[package_name] = tokenList;
		}

		for (const package_name in mapTokenData) {
			this.doSendMany(notification, package_name, mapTokenData[package_name], timeToLive);
		}
	}
}

HuaweiPush.doSendMany = function(notification, package_name, tokens, timeToLive) {
	this.checkToken(package_name, (tokenError) => {
		if (!tokenError) {
			if (HuaweiPush.debug)
				console.log("sendMany ", notification, timeToLive);
			const postData = this.getPostData(notification, package_name, tokens, timeToLive);
			request.post({
				url: apiUrl.replace('[clientid]', this.authInfo[package_name].client_id),
				body: JSON.stringify(postData),
				'headers': {
					'Authorization': 'Bearer '+ this.authInfo[package_name].access_token
				},
				timeout: timeout,
				maxAttempts: 2,
				retryDelay: 5000,
				time: true,
				retryStrategy: request.RetryStrategies.NetworkError
			}, (error, response, body) => {
				if (HuaweiPush.debug)
					console.log("sendMany result", error, body);
				if (!error && response && response.statusCode == 200) {
					if (HuaweiPush.debug)
						console.log("TODO: callback");
				} else {
					error = error || 'unknown error';
				}
			});
		}
	});
}

HuaweiPush.getPostData = function(notification, package_name, tokens, timeToLive) {
	const postData = {
		"validate_only": false,
		"message": {
			"android": {
				"notification": {
					"title": notification.android.title,
					"body": notification.android.message,
					"click_action": {
						"type": 3
					}
				},
				"category": "WORK"
			},
			"token": tokens,
			"data": JSON.stringify(notification.extras)
		}
	  }
	return postData;
}

HuaweiPush.sendAll = function(notification, timeToLive) {
	if (notification.android.title) {
		for (const package_name in this.authInfo) {
			console.log("TODO: sendAll");
		}
	}
}

HuaweiPush.checkToken = function(package_name, callback) {
	const authInfo = this.authInfo[package_name];
	if (authInfo.access_token && Date.now() < authInfo.access_token_expire) {
		callback();
	} else {
		if (HuaweiPush.debug)
			console.info("request token ", package_name, this.authInfo[package_name]);
		request.post({
			url: tokenUrl,
			form: {
				grant_type: "client_credentials",
				client_id: authInfo.client_id,
				client_secret: authInfo.client_secret
			},
			timeout: timeout,
			maxAttempts: 2,
			retryDelay: 5000,
			retryStrategy: request.RetryStrategies.NetworkError
		}, (error, response, body) => {
			if (!error) {
				const data = JSON.parse(body);
				authInfo.access_token = data.access_token;
				authInfo.access_token_expire = Date.now() + data.expires_in * 1000 - 60 * 1000;
				if (HuaweiPush.debug)
					console.info("get access token success", data);
				callback();
			} else {
				console.error("get access token error", body);
				callback(error);
			}
		});
	}
}

HuaweiPush.formatHuaweiDate = function(date) {
	return moment(date).format("YYYY-MM-DDTHH:mm");
}

/*
 * 用户自定义 dict
 * "extras":{"season":"Spring", "weather":"raining"}]
 */
HuaweiPush.extras = function(extras) {
	if (Array.isArray(extras))
		return extras;

	var extraArray = [];
	if (extras) {
		var keys = Object.keys(extras);
		keys.forEach(function(key) {
			var v = {};
			v[key] = extras[key];
			extraArray.push(v)
		})
		extras = extraArray
	}
	return extraArray;
};
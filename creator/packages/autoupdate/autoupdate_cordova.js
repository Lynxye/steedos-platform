var DEBUG_TAG = 'METEOR CORDOVA DEBUG (autoupdate_cordova.js) ';
var log = function (msg) {
	console.log(DEBUG_TAG + msg);
};
// This constant was picked by testing on iOS 7.1
// We limit the number of concurrent downloads because iOS gets angry on the
// application when a certain limit is exceeded and starts timing-out the
// connections in 1-2 minutes which makes the whole HCP really slow.
var MAX_NUM_CONCURRENT_DOWNLOADS = 30;
var MAX_RETRY_COUNT = 5;

var autoupdateVersionsCordova =
	__meteor_runtime_config__.autoupdate.versions["web.cordova"] || {
		version: "unknown"
	};

var autoupdateVersionCordova = autoupdateVersionsCordova.version;

// The collection of acceptable client versions.
ClientVersions = new Mongo.Collection("meteor_autoupdate_clientVersions");

Autoupdate = {};

Autoupdate.newClientAvailable = function () {
	return !! ClientVersions.findOne({
		_id: 'version-cordova',
		version: {$ne: autoupdateVersionCordova}
	});
};

var hasCalledReload = false;
var updating = false;
var localPathPrefix = null;
var retry = new Retry({
	// Unlike the stream reconnect use of Retry, which we want to be instant
	// in normal operation, this is a wacky failure. We don't want to retry
	// right away, we can start slowly.
	//
	// A better way than timeconstants here might be to use the knowledge
	// of when we reconnect to help trigger these retries. Typically, the
	// server fixing code will result in a restart and reconnect, but
	// potentially the subscription could have a transient error.
	minCount: 0, // don't do any immediate retries
	baseTimeout: 30*1000 // start with 30s
});
var failures = 0;

Autoupdate._retrySubscription = function () {
	var appId = __meteor_runtime_config__.appId;
	Meteor.subscribe("meteor_autoupdate_clientVersions", appId, {
		onError: function (err) {
			Meteor._debug("autoupdate subscription failed:", err);
			failures++;
			retry.retryLater(failures, function () {
				// Just retry making the subscription, don't reload the whole
				// page. While reloading would catch more cases (for example,
				// the server went back a version and is now doing old-style hot
				// code push), it would also be more prone to reload loops,
				// which look really bad to the user. Just retrying the
				// subscription over DDP means it is at least possible to fix by
				// updating the server.
				Autoupdate._retrySubscription();
			});
		}
	});
	if (Package.reload) {
		var checkNewVersionDocument = function (doc) {
			var self = this;
			if (doc.version !== autoupdateVersionCordova) {
				Meteor.setTimeout(function(){
					if(!window.languages){
						window.languages = {};
					}
					if(!window.languages.en){
						window.languages = window._languages;
					}
					window.fireGlobalEvent('onNewVersion', doc.version);
				}, 600)
				// onNewVersion();
			}
		};
		var handle = ClientVersions.find({
			_id: 'web.cordova'
		}).observe({
			added: checkNewVersionDocument,
			changed: checkNewVersionDocument
		});
	}
};

Meteor.startup(Autoupdate._retrySubscription);

window.WebAppLocalServer = {};
WebAppLocalServer.onNewVersionReady = function() {
};
WebAppLocalServer.startupDidComplete = function(a,b,c) {
};
WebAppLocalServer.checkForUpdates = function(a,b,c) {
};
WebAppLocalServer.onError = function(a,b,c) {
};
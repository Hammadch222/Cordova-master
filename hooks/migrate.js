var fs = require('fs');
var xml2js = require('xml2js');
var plist = require('plist');

const exec = require('child_process').exec;

var androidMetaDataKeys = ["com.webengage.sdk.android.key", 
	"com.webengage.sdk.android.debug", 
	"com.webengage.sdk.android.project_number", 
	"com.webengage.sdk.android.location_tracking", 
	"com.webengage.sdk.android.auto_gcm_registration", 
	"com.webengage.sdk.android.environment", 
	"com.webengage.sdk.android.alternate_interface_id", 
	"com.webengage.sdk.android.small_icon", 
	"com.webengage.sdk.android.large_icon", 
	"com.webengage.sdk.android.accent_color"];

function getAutoGcmRegistration(metaData) {
	if (metaData === undefined || metaData === null || metaData.length === 0) {
		return false;
	}
	for (var i = 0; i < metaData.length; i++) {
		if (metaData[i]['$'] && metaData[i]['$']['android:name'] === "com.webengage.sdk.android.auto_gcm_registration") {
			if (metaData[i]['$']['android:value'] == "true") {
				return true;
			} else {
				return false;
			}
		}
	}
	return false;
}

function getLocationTrackingFlag(metaData) {
	if (metaData === undefined || metaData === null || metaData.length === 0) {
		return false;
	}
	for (var i = 0; i < metaData.length; i++) {
		if (metaData[i]['$'] && metaData[i]['$']['android:name'] === "com.webengage.sdk.android.location_tracking") {
			if (metaData[i]['$']['android:value'] == "true") {
				return true;
			} else {
				return false;
			}
		}
	}
	return false;
}

function getPushReceiver() {
	var receiver = {"intent-filter": []};
	receiver['$'] = {"android:name": "com.webengage.sdk.android.WebEngagePushReceiver", "android:permission": "com.google.android.c2dm.permission.SEND"};
	var action = {};
	action['$'] = {"android:name": "com.google.android.c2dm.intent.RECEIVE"};
	var category = {};
	category['$'] = {"android:name": "${applicationId}"};
	receiver['intent-filter'] = {"action": [], "category": []};
	receiver['intent-filter']['action'] = action;
	receiver['intent-filter']['category'] = category;
	return receiver;
}

function migrateMetaData(manifest, config) {
	try {
		if (manifest["application"] && manifest["application"] instanceof Array && manifest["application"].length > 0) {
			var metaData = manifest.application[0]['meta-data'];
			if (metaData == null || metaData.length == 0) {
				return config;
			}

			var webengageMetaData = metaData.filter(
				metaData => (metaData && metaData['$'] && androidMetaDataKeys.indexOf(metaData['$']['android:name']) > -1)
			);
			if (webengageMetaData != null && webengageMetaData.length > 0) {
				if (!config['$']) {
					config['$'] = {"xmlns:android": "http://schemas.android.com/apk/res/android"};
				}

				if (!config['$']['xmlns:android']) {
					config['$']['xmlns:android'] = "http://schemas.android.com/apk/res/android";
				}

				var platforms = config.platform;
				var androidPlatform = platforms.filter(
					platform => (platform && platform['$'] && platform['$']['name'] === "android")
				);
				if (androidPlatform == null || androidPlatform.length == 0) {
					androidPlatform[0] = {"platform": []};
					androidPlatform[0]['$'] = {"name": "android"};
					platforms.push(androidPlatform[0]);
				}

				var platformConfigFiles = androidPlatform[0]['config-file'];
				if (platformConfigFiles == null) {
					platformConfigFiles = new Array();
					androidPlatform[0]['config-file'] = platformConfigFiles;
				}

				var configFiles = platformConfigFiles.filter(
					configFile => (configFile && configFile['$'] && configFile['$']['parent'] === "/manifest/application")
				);
				if (configFiles === null) {
					configFiles = new Array();
				}

				if (configFiles.length === 0) {
					configFiles[0] = {"meta-data": []};
					configFiles[0]['$'] = {"parent": "/manifest/application", "target": "AndroidManifest.xml"};
					platformConfigFiles.push(configFiles[0]);
				}

				var configMetaData = configFiles[0]['meta-data'];
				if (configMetaData == null || configMetaData.length == 0) {
					configMetaData = new Array();
					for (var i = 0; i < webengageMetaData.length; i++) {
						configMetaData.push(webengageMetaData[i]);
					}
					configFiles[0]['meta-data'] = configMetaData;
				} else {
					var configMetaDataNames = [];
					for (var i = 0; i < configMetaData.length; i++) {
						if (configMetaData[i]['$']) {
							configMetaDataNames.push(configMetaData[i]['$']['android:name']);
						}
					}
					webengageMetaData = webengageMetaData.filter(
						metaData => !(metaData && metaData['$'] && configMetaDataNames.indexOf(metaData['$']['android:name']) > -1)
					);
					for (var i = 0; i < webengageMetaData.length; i++) {
						configMetaData.push(webengageMetaData[i]);
					}
				}

				var registerAutoGcm = getAutoGcmRegistration(configMetaData);
				if (registerAutoGcm) {
					// Add push permissions
					var manifestConfigFile = platformConfigFiles.filter(
						configFile => (configFile && configFile['$'] && configFile['$']['parent'] === "/manifest")
					);
					if (manifestConfigFile == null || manifestConfigFile.length == 0) {
						manifestConfigFile = [];
						manifestConfigFile[0] = {"uses-permission": [], "permission": []};
						manifestConfigFile[0]['$'] = {"parent": "/manifest", "target": "AndroidManifest.xml"};
						androidPlatform[0]['config-file'].push(manifestConfigFile[0]);
					}
					var usesPermissions = manifestConfigFile[0]['uses-permission'];
					if (usesPermissions == null) {
						usesPermissions = new Array();
						manifestConfigFile[0]['uses-permission'] = usesPermissions;
					}
					
					var permissions = manifestConfigFile[0]['permission'];
					if (permissions == null) {
						permissions = new Array();
						manifestConfigFile[0]['permission'] = permissions;
					}

					var hasReceivePermission = false;
					var hasMessagePermission = false;
					var hasSignatureMessagePermission = false;
					for (var i = 0; i < usesPermissions.length; i++) {
						if (usesPermissions[i] && usesPermissions[i]['$']) {
							if (usesPermissions[i]['$']['android:name'] == "com.google.android.c2dm.permission.RECEIVE") {
								hasReceivePermission = true;
							} else if (usesPermissions[i]['$']['android:name'] == "${applicationId}.permission.C2D_MESSAGE") {
								hasMessagePermission = true;
							}
						}
					}
					for (var i = 0; i < permissions.length; i++) {
						if (permissions[i] && permissions[i]['$'] && permissions[i]['$']['android:name'] === "${applicationId}.permission.C2D_MESSAGE" && permissions[i]['$']['android:protectionLevel'] && permissions[i]['$']['android:protectionLevel'] === "signature") {
							hasSignatureMessagePermission = true;
							break;
						}
					}
					if (!hasReceivePermission) {
						var receiverPermission = {};
						receiverPermission['$'] = {"android:name": "com.google.android.c2dm.permission.RECEIVE"};
						manifestConfigFile[0]['uses-permission'].push(receiverPermission);
					}
					if (!hasMessagePermission) {
						var messagePermission = {};
						messagePermission['$'] = {"android:name": "${applicationId}.permission.C2D_MESSAGE"};
						manifestConfigFile[0]['uses-permission'].push(messagePermission);
					}
					if (!hasSignatureMessagePermission) {
						var signatureMessagePermission = {};
						signatureMessagePermission['$'] = {"android:name": "${applicationId}.permission.C2D_MESSAGE", "android:protectionLevel": "signature"};
						manifestConfigFile[0]['permission'].push(signatureMessagePermission);
					}

					// Add PushReceiver
					var receivers = configFiles[0]['receiver'];
					if (receivers == null || receivers.length == 0) {
						receivers = new Array();
						receivers[0] = getPushReceiver();
						configFiles[0]['receiver'] = receivers;
					} else {
						var prevReceivers = receivers.filter(
							receiver => (receiver && receiver['$'] && receiver['$']['android:name'] == "com.webengage.sdk.android.WebEngagePushReceiver")
						);
						if (!prevReceivers || prevReceivers === null || prevReceivers.length === 0) {
							receivers.push(getPushReceiver());
						}
					}
				}

				var locationTrackingFlag = getLocationTrackingFlag(configMetaData);
				if (locationTrackingFlag) {
					// Add location permission
					var manifestConfigFile = platformConfigFiles.filter(
						configFile => (configFile && configFile['$'] && configFile['$']['parent'] === "/manifest")
					);
					if (manifestConfigFile == null || manifestConfigFile.length == 0) {
						manifestConfigFile = [];
						manifestConfigFile[0] = {"uses-permission": [], "permission": []};
						manifestConfigFile[0]['$'] = {"parent": "/manifest", "target": "AndroidManifest.xml"};
						androidPlatform[0]['config-file'].push(manifestConfigFile[0]);
					}
					var usesPermissions = manifestConfigFile[0]['uses-permission'];
					if (usesPermissions == null) {
						usesPermissions = new Array();
						manifestConfigFile[0]['uses-permission'] = usesPermissions;
					}

					var hasLocationPermission = false;
					for (var i = 0; i < usesPermissions.length; i++) {
						if (usesPermissions[i] && usesPermissions[i]['$'] && usesPermissions[i]['$']['android:name'] == "android.permission.ACCESS_FINE_LOCATION") {
							hasLocationPermission = true;
							break;
						}
					}
					if (!hasLocationPermission) {
						var locationPermission = {};
						locationPermission['$'] = {"android:name": "android.permission.ACCESS_FINE_LOCATION"};
						usesPermissions.push(locationPermission);
					}
				}
			}
		}
	} catch(e) {
		console.log("Error migrating Android meta-data to config.xml");
	}
    return config;
}

function migrateAndroid(config, callback) {
	try {
		var manifestPath = 'platforms/android/AndroidManifest.xml';

		// As of cordova android 7.0.0, manifest path has been changed
		if (!fs.existsSync(manifestPath)) {
			manifestPath = 'platforms/android/app/src/main/AndroidManifest.xml';
		}

		if (!fs.existsSync(manifestPath)) {
			callback(config);
		} else {
			var manifest = fs.readFileSync(manifestPath);
			xml2js.parseString(manifest.toString(), function(manifestParseError, manifestResult) {
				if (manifestParseError) {
					console.log("Error parsing AndroidManifest file: " + manifestParseError);
					callback(config);
				} else {
					// Move all meta-data tags from AndroidManifest.xml to config.xml
					config = migrateMetaData(manifestResult.manifest, config);

					callback(config);
				}
			});
		}
	} catch(e) {
		callback(config);
	}
}

function migrateInfoPlist(infoPlist, config) {
	try {
		var infoPlistObj = plist.parse(infoPlist, 'utf8');

		var licenseCode = infoPlistObj['WEGLicenseCode'];
		var apnsAutoRegister = infoPlistObj['WEGApnsAutoRegister'];
		var logLevel = infoPlistObj['WEGLogLevel'];

		var platforms = config.platform;
		var iosPlatforms = platforms.filter(
			platform => (platform && platform['$'] && platform['$']['name'] === "ios")
		);
		if (iosPlatforms == null || iosPlatforms.length == 0) {
			iosPlatforms[0] = {"platform": []};
			iosPlatforms[0]['$'] = {"name": "ios"};
			platforms.push(iosPlatforms[0]);
		}
		var iosPlatform = iosPlatforms[0];

		var configFiles = iosPlatform['config-file'];
		if (!configFiles || configFiles == null) {
			configFiles = new Array();
			iosPlatform['config-file'] = configFiles;
		}

		if (licenseCode) {
			var licenseCodeConfigFiles = configFiles.filter(
				configFile => (configFile && configFile['$'] && configFile['$']['target'] && configFile['$']['target'] == "*-Info.plist" && configFile['$']['parent'] && configFile['$']['parent'] == "WEGLicenseCode")
			);
			if (!licenseCodeConfigFiles || licenseCodeConfigFiles.length == 0) {
				var licenseCodeConfigFile = {"string": licenseCode};
				licenseCodeConfigFile['$'] = {"parent": "WEGLicenseCode", "target": "*-Info.plist"};
				configFiles.push(licenseCodeConfigFile);
			}
		}

		if (apnsAutoRegister != undefined) {
			var apnsAutoRegisterConfigFiles = configFiles.filter(
				configFile => (configFile && configFile['$'] && configFile['$']['target'] && configFile['$']['target'] == "*-Info.plist" && configFile['$']['parent'] && configFile['$']['parent'] == "WEGApnsAutoRegister")
			);
			if (!apnsAutoRegisterConfigFiles || apnsAutoRegisterConfigFiles.length == 0) {
				var apnsAutoRegisterConfigFile = {};
				if (apnsAutoRegister) {
					apnsAutoRegisterConfigFile = {"true": {}};
				} else {
					apnsAutoRegisterConfigFile = {"false": {}};
				}
				apnsAutoRegisterConfigFile['$'] = {"parent": "WEGApnsAutoRegister", "target": "*-Info.plist"};
				configFiles.push(apnsAutoRegisterConfigFile);
			}
		}

		if (logLevel) {
			var logLevelConfigFiles = configFiles.filter(
				configFile => (configFile && configFile['$'] && configFile['$']['target'] && configFile['$']['target'] == "*-Info.plist" && configFile['$']['parent'] && configFile['$']['parent'] == "WEGLogLevel")
			);
			if (!logLevelConfigFiles || logLevelConfigFiles.length == 0) {
				var logLevelConfigFile = {"string": logLevel};
				logLevelConfigFile['$'] = {"parent": "WEGLogLevel", "target": "*-Info.plist"};
				configFiles.push(logLevelConfigFile);
			}
		}
	} catch(e) {
		console.log("Error in migrating iOS info plist to config.xml");
	}
	return config;
}

function migrateIos(config) {
	try {
		var appName = config.name;
		if (!appName) {
			return config;
		}

		var iosDir = "platforms/ios/" + appName;
		if (!fs.existsSync(iosDir)) {
			return config;
		}

		var files = fs.readdirSync(iosDir);
		files = files.filter(
			file => (file && file.endsWith("-Info.plist"))
		);
		if (files && files != null) {
			for (var i = 0; i < files.length; i++) {
				var infoPlist = fs.readFileSync(iosDir + "/" + files[i], 'utf8');
				config = migrateInfoPlist(infoPlist, config);
			}
		}
	} catch(e) {
		console.log("Error migrating iOS configurations");
	}
	return config;
}

async function clean() {
	exec('cordova clean');
}

function migrate() {
	var configPath = "config.xml";
	if (!fs.existsSync(configPath)) {
		return;
	}

	fs.readFile(configPath, function(configReadError, config) {
		if (configReadError) {
			console.log("Error reading config.xml file: " + configReadError);
		} else {
			xml2js.parseString(config.toString(), function(configParseError, configResult) {
				if (configParseError) {
					console.log("Error parsing config.xml file: " + configParseError);
				} else {
					configResult.widget = migrateIos(configResult.widget);

					migrateAndroid(configResult.widget, function(widget) {
						configResult.widget = widget;
						var configXml = new xml2js.Builder().buildObject(configResult);
						try {
							fs.writeFileSync(configPath, configXml);
						} catch(e) {
							process.stdout.write(e);
						}
					});

					clean();
				}
			});
		}
	});
}

migrate();

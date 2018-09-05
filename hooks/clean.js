var fs = require('fs');
var xml2js = require('xml2js');

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

var androidReceivers = ["com.webengage.sdk.android.WebEngageReceiver"];

function checkValidXml2jsNode(node) {
    return node && node instanceof Array && node.length > 0;
}

function cleanAndroidJson(android) {
    try {
        var androidMetaData = android['config_munge']["files"]["AndroidManifest.xml"]["parents"]["/manifest/application"];
        console.log("android tags: " + androidMetaData.length);
        if (androidMetaData) {
            androidMetaData = androidMetaData.filter(metaData => !(metaData && metaData['xml'] && metaData['xml'].includes("\"com.webengage.sdk.android.")))
        }
        console.log("android tags: " + androidMetaData.length);
        android['config_munge']["files"]["AndroidManifest.xml"]["parents"]["/manifest/application"] = androidMetaData;
    } catch(e) {
        console.log("Error cleaning android.json file.");
    }
    return android;
}

function removeMetaData(manifest) {
    if (checkValidXml2jsNode(manifest.application)) {
		var manifestMetaData = manifest.application[0]['meta-data'];
		manifestMetaData = (checkValidXml2jsNode(manifestMetaData)) ? manifestMetaData.filter(metaData => !(metaData && metaData['$'] && androidMetaDataKeys.indexOf(metaData['$']['android:name']) > -1)) : [];
		manifest.application[0]['meta-data'] = manifestMetaData;
	}
	return manifest;
}

function removeReceivers(manifest) {
	if (checkValidXml2jsNode(manifest.application)) {
		var receivers = manifest.application[0].receiver;
		receivers = checkValidXml2jsNode(receivers) ? receivers.filter(receiver => !(receiver && receiver['$'] && androidReceivers.indexOf(receiver['$']['android:name']) > -1)) : [];
		manifest.application[0].receiver = receivers;
	}
	return manifest;
}

function cleanAndroid() {
    var androidFilename = "platforms/android/android.json";
    if (fs.existsSync(androidFilename)) {
        fs.readFile(androidFilename, 'utf8', function(err, data) {
            if (!err) {
                var android = JSON.parse(data);
                android = cleanAndroidJson(android);
    
                fs.writeFile(androidFilename, JSON.stringify(android, null, 2), function (err) {
                    if (!err) {
                        console.log(JSON.stringify(android));
                        console.log('writing to ' + androidFilename);
                    }
                });
            }
        });
    }

    var manifestPath = 'platforms/android/AndroidManifest.xml';
    if (!fs.existsSync(manifestPath)) {
        manifestPath = 'platforms/android/app/src/main/AndroidManifest.xml';
    }
    if (fs.existsSync(manifestPath)) {
        var manifest = fs.readFileSync(manifestPath);
        xml2js.parseString(manifest.toString(), function(manifestParseError, manifestResult) {
            if (manifestParseError) {
                console.log("Error parsing AndroidManifest file: " + manifestParseError);
            } else {
                // Remove all meta-data and receiver tags from AndroidManifest.xml
                manifestResult.manifest = removeMetaData(manifestResult.manifest);
                manifestResult.manifest = removeReceivers(manifestResult.manifest);
                var manifestXml = new xml2js.Builder().buildObject(manifestResult);
                try {
                    fs.writeFileSync(manifestPath, manifestXml);
                } catch(e) {
                    process.stdout.write(e);
                }
            }
        });
    }
}

function clean() {
    cleanAndroid();
}

clean();

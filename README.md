# WebEngage Plugin for Cordova/Phonegap


The Cordova SDK was tested on Cordova v8.0.0 for Cordova android ^7.0.0 and Cordova iOS ^4.5.5. Read the complete documentation at [WebEngage Cordova/PhoneGap Plugin Documentation](http://docs.webengage.com/docs/cordova-integration)


## Installation

```
cordova plugin add cordova-plugin-webengage --fetch
```


## Integration

Add the following details in your `config.xml` file.

```xml
<widget ... xmlns:android="http://schemas.android.com/apk/res/android">
    ...
    <!-- For Android -->
    <platform name="android">
        <config-file parent="/manifest/application" target="AndroidManifest.xml">
            ...
            <meta-data android:name="com.webengage.sdk.android.key" android:value="YOUR-LICENSE-CODE" />
        </config-file>
    </platform>

    <!-- For iOS -->
    <platform name="ios">
        ...
        <config-file parent="WEGLicenseCode" target="*-Info.plist">
            <string>YOUR-LICENSE-CODE</string>
        </config-file>
    <.platform>

</widget>
```

**Note:** Replace 'YOUR-LICENSE-CODE' with your WebEngage License Code.


## Initialization

Initialize WebEngage SDK in your `wwww/js/index.js` file.

```javascript
var app = {
    ...
    onDeviceReady: function() {
        ...

        // WebEngage initialization
        webengage.engage();
    }
}
```


## Configurations

### 1. Enable/Disable SDK Logs

Add the following tags in your `config.xml` file.

```xml
<widget ... >
    ...
    <!-- For Android -->
    <platform name="android">
        <config-file parent="/manifest/application" target="AndroidManifest.xml">
            ...
            <meta-data android:name="com.webengage.sdk.android.debug" android:value="true" />
        </config-file>
    </platform>

    <!-- For iOS -->
    <platform name="ios">
        ...
        <config-file parent="WEGLogLevel" target="*-Info.plist">
            <string>VERBOSE</string>
        </config-file>
    </platform>

</widget>
```

**Note:** Supported values for 'WEGLogLevel': 'VERBOSE', 'DEFAULT'.


### 2. Location Tracking

Add the following tags in your `config.xml` file. 

```xml
<widget ... >
    ...
    <!-- For Android -->
    <platform name="android">
        <config-file parent="/manifest/application" target="AndroidManifest.xml">
            ...
            <meta-data android:name="com.webengage.sdk.android.location_tracking" android:value="true" />
        </config-file>
        <config-file parent="/manifest" target="AndroidManifest.xml">
            ...
            <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
        </config-file>
    </platform>

    <!-- For iOS -->
    <platform name="ios">
        ...
        <config-file parent="UIBackgroundModes" target="*Info.plist">
            <array>
                <string>location</string>
            </array>
        </config-file>
    </platform>

</widget>
```


## Tracking Users

You can set user attributes as shown in below example.

```javascript
// User login
webengage.user.login("user-id");

// User logout
webengage.user.logout();

// Set system user attributes
webengage.user.setAttribute("we_first_name", "John");
webengage.user.setAttribute("we_last_name", "Doe");
webengage.user.setAttribute("we_email", "john.doe@gmail.com");
webengage.user.setAttribute("we_birth_date", "1986-08-19");
webengage.user.setAttribute("we_phone", "+551155256325");
webengage.user.setAttribute("we_gender", "male");  // Supported values: 'male', 'female', 'other'
webengage.user.setAttribute("we_company", "Alphabet Inc.");
webengage.user.setAttribute("we_hashed_email", "144e0424883546e07dcd727057fd3b62");
webengage.user.setAttribute("we_hashed_phone", "e0ec043b3f9e198ec09041687e4d4e8d");

// Set custom user attributes
webengage.user.setAttribute("Category", "GOLD");
webengage.user.setAttribute("Value Index", 5.06);
webengage.user.setAttribute("Inactive", false);
webengage.user.setAttribute("Registered On", new Date("2015-11-09T10:01:11.000Z"));
```

**Note:** WebEngage SDK only supports the following data-types: String, Number, Boolean and Date.


## Tracking Events

You can track events as shown in the following example.

```javascript
// Simple event
webengage.track("Added to cart");

// Event with attributes
webengage.track("Purchased", {"product-id": "123", "product-name": "wrist-watch", "product-price": 25.65});
```

**Note:** WebEngage SDK only supports the following data-types: String, Number, Boolean and Date.


## Push Notifications

### 1. Android Push Notification Integration

Add the following in your `config.xml` file, under android platform tag.

```xml
<widget ... xmlns:android="http://schemas.android.com/apk/res/android">
    ...
    <platform name="android">
        <config-file parent="/manifest/application" target="AndroidManifest.xml">
            ...
            <meta-data 
                android:name="com.webengage.sdk.android.project_number" android:value="$12345678910" />

            <meta-data 
                android:name="com.webengage.sdk.android.auto_gcm_registration" 
                android:value="true" />

            <receiver 
                android:name="com.webengage.sdk.android.WebEngagePushReceiver" android:permission="com.google.android.c2dm.permission.SEND">
                <intent-filter>
                    <action android:name="com.google.android.c2dm.intent.RECEIVE" />
                    <category android:name="${applicationId}" />
                </intent-filter>
            </receiver>

            <!-- Optional -->
            <!-- Add only if the provided image exists -->
            <meta-data
                android:name="com.webengage.sdk.android.small_icon"
                android:resource="@drawable/small_icon" />

            <!-- Optional -->
            <!-- Add only if the provided image exists -->
            <meta-data
                android:name="com.webengage.sdk.android.large_icon"
                android:resource="@drawable/large_icon" />

            <!-- Optional -->
            <meta-data
                android:name="com.webengage.sdk.android.accent_color"
                android:value="#FF0000" />
        </config-file>
        <config-file parent="/manifest" target="AndroidManifest.xml">
            ...
            <uses-permission android:name="com.google.android.c2dm.permission.RECEIVE" />
            <uses-permission android:name="${applicationId}.permission.C2D_MESSAGE" />
            <permission android:name="${applicationId}.permission.C2D_MESSAGE" android:protectionLevel="signature" />
        </config-file>
    </platform>
    ...
</widget>
```

**Note:** Replace the value of android.project_number with your GCM/FCM Project Number (Sender ID).

### 2. iOS Push Notification Integration

Enable 'Push Notifications' under capabilities tab in your XCode and then add 'WEGApnsAutoRegister' to info.plist with value true in `config.xml` file as shown below.

```xml
<widget ...>
    ...
    <platform name="ios">
        ...
        <config-file parent="WEGApnsAutoRegister" target="*-Info.plist">
            <true />
        </config-file>
    </platform>
</widget>
```

### 3. Push Notification Callbacks

```javascript
webengage.push.onClick(function(deeplink, customData) {
    console.log("Push notification clicked");
    ...
});
```


## In-App Notifications

No additional changes are required to show in-app notifications.

### In-App Notification Callbacks

```javascript
webengage.notification.onShown(function(inAppData) {
    console.log("In-app notification shown");
    ...
});

webengage.notification.onClick(function(inAppData, actionId) {
    console.log("In-app notification clicked");
    ...
});

webengage.notification.onDismiss(function(inAppData) {
    console.log("In-app notification dismissed");
    ...
});
```


## Troubleshooting

### 1. Manifest merger failed

```
Error: Element meta-data#com.webengage.sdk.android... at AndroidManifest.xml:... duplicated with element declared at AndroidManifest.xml:...
...
Error:
	Validation failed, exiting
```

This error is caused when there are duplicate meta-data tags in your AndroidManifest.xml file. To resolve this problem, simply run the command `cordova clean`.

### 2. AAPT: Error: unbound prefix

```
A problem occurred configuring project ':app'.
> org.xml.sax.SAXParseException; systemId: file:/.../AndroidManifest.xml; lineNumber: ...; columnNumber: ...; The prefix "android" for attribute "..." associated with an element type "manifest" is not bound.
```

This error is caused when AAPT cannot identify the prefix 'android' from your AndroidManifest.xml. To resolve this error, just add the android namespace attribute to the widget tag in your `config.xml` file as shown below.

```xml
<widget ... xmlns:android="http://schemas.android.com/apk/res/android">
    ...
</widget>
```


## Cordova Sample Project

Refer our [Cordova Sample Project](https://github.com/WebEngage/cordova-sample) for sample usage.

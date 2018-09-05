package com.webengage.cordova;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.app.Application;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.Context;
import android.location.Location;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import android.media.RingtoneManager;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.TimeZone;
import java.util.GregorianCalendar;
import java.util.Calendar;
import java.util.Iterator;
import java.util.Locale;

import java.text.SimpleDateFormat;

import com.webengage.sdk.android.Logger;
import com.webengage.sdk.android.WebEngage;
import com.webengage.sdk.android.WebEngageConfig;
import com.webengage.sdk.android.LocationTrackingStrategy;
import com.webengage.sdk.android.callbacks.PushNotificationCallbacks;
import com.webengage.sdk.android.actions.render.PushNotificationData;
import com.webengage.sdk.android.actions.render.InAppNotificationData;
import com.webengage.sdk.android.callbacks.InAppNotificationCallbacks;
import com.webengage.sdk.android.callbacks.LifeCycleCallbacks;
import com.webengage.sdk.android.utils.DataType;
import com.webengage.sdk.android.UserProfile;
import com.webengage.sdk.android.UserProfile.Builder;
import com.webengage.sdk.android.utils.Gender;

public class WebEngagePlugin extends CordovaPlugin implements PushNotificationCallbacks, InAppNotificationCallbacks, LifeCycleCallbacks {
    private static final String TAG = "WebEngagePlugin";
    private static CordovaWebView webView;

    private Map<String,Object> pushOptions = new HashMap<String,Object>();
    private static final String PUSH_SOUND = "sound";
    private static final String PUSH_VIBRATION = "vibration";
    private static final String PUSH_SHOULD_RENDER = "shouldRender";

    private Map<String,Object> inappOptions = new HashMap<String, Object> ();
    private static final String INAPP_SHOULD_RENDER = "shouldRender";

    private Map<String,Object> globalOptions = new HashMap<String, Object>();
    private static  String PENDING_PUSH_URI = null;
    private static  JSONObject PENDING_PUSH_CUSTOM_DATA = null;
    private static  boolean IS_PUSH_CALLBACK_PENDING = false;
    private static final String FIRST_NAME = "we_first_name";
    private static final String LAST_NAME = "we_last_name";
    private static final String EMAIL = "we_email";
    private static final String BIRTH_DATE = "we_birth_date";
    private static final String PHONE = "we_phone";
    private static final String GENDER = "we_gender";
    private static final String COMPANY = "we_company";
    private static final String HASHED_EMAIL = "we_hashed_email";
    private static final String HASHED_PHONE = "we_hashed_phone";

    static {
        Log.d(TAG, "Static Block called");
    }

    public WebEngagePlugin() {
        Log.d(TAG, "Constructor called");
    }

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);
        this.webView = webView;
        Log.d(TAG, "Intialized");
    }
    
    @Override
    public boolean execute(String action, JSONArray args, final CallbackContext callbackContext) throws JSONException {
        Logger.v(TAG,"Execute: " + action);
        
        if ("engage".equals(action)) {
            WebEngage.registerPushNotificationCallback(this);
            WebEngage.registerInAppNotificationCallback(this);
            WebEngage.registerLifeCycleCallback(this);
            
            if (args != null && args.length() > 0 && args.get(0) instanceof JSONObject) {
                // Dynamic config
                JSONObject config = args.getJSONObject(0);

                WebEngageConfig.Builder configBuilder = new WebEngageConfig.Builder();
                if (!config.isNull("licenseCode")) {
                    configBuilder.setWebEngageKey(config.optString("licenseCode"));
                }
                if (!config.isNull("debug")) {
                    configBuilder.setDebugMode(config.optBoolean("debug"));
                }

                if (!config.isNull("android")) {
                    JSONObject androidConfig = config.getJSONObject("android");
                    if (!androidConfig.isNull("autoPushRegister")) {
                        configBuilder.setAutoGCMRegistrationFlag(androidConfig.optBoolean("autoPushRegister"));
                    }
                    if (!androidConfig.isNull("pushProjectNumber")) {
                        configBuilder.setGCMProjectNumber(androidConfig.optString("pushProjectNumber"));
                    }
                    if (!androidConfig.isNull("locationTrackingStrategy")) {
                        if ("accuracy_best".equals(androidConfig.optString("locationTrackingStrategy"))) {
                            configBuilder.setLocationTrackingStrategy(LocationTrackingStrategy.ACCURACY_BEST);
                        } else if ("accuracy_city".equals(androidConfig.optString("locationTrackingStrategy"))) {
                            configBuilder.setLocationTrackingStrategy(LocationTrackingStrategy.ACCURACY_CITY);
                        } else if ("accuracy_country".equals(androidConfig.optString("locationTrackingStrategy"))) {
                            configBuilder.setLocationTrackingStrategy(LocationTrackingStrategy.ACCURACY_COUNTRY);
                        } else if ("disabled".equals(androidConfig.optString("locationTrackingStrategy"))) {
                            configBuilder.setLocationTrackingStrategy(LocationTrackingStrategy.DISABLED);
                        }
                    }
                }

                WebEngage.engage(cordova.getActivity().getApplicationContext(), configBuilder.build());
            } else {
                // Static config read from config.xml
                WebEngage.engage(cordova.getActivity().getApplicationContext());
            }

            WebEngage.get().analytics().start(cordova.getActivity());
            callbackContext.success();
            if (IS_PUSH_CALLBACK_PENDING) {
                IS_PUSH_CALLBACK_PENDING = false;
                webView.sendJavascript("javascript:webengage.push.onCallbackReceived( 'click', '" + PENDING_PUSH_URI + "'," + PENDING_PUSH_CUSTOM_DATA + ");");
                PENDING_PUSH_CUSTOM_DATA = null;
                PENDING_PUSH_URI = null;
            }
        } else if ("pushOptions".equals(action)) {
            if (args.length() == 2 && !args.isNull(0)) {
                pushOptions.put(args.getString(0), args.get(1));
            }
        } else if ("inappOptions".equals(action)) {
            if (args.length() == 2 && !args.isNull(0)) {
                inappOptions.put(args.getString(0), args.get(1));
            }
        } else if ("globalOptions".equals(action)) {
            Logger.v(TAG, args.getString(0) + " " + args.getString(1));
            if (args.length() == 2 && !args.isNull(0)) {
                globalOptions.put(args.getString(0), args.get(1));
            }
        } else if ("track".equals(action)) {
            if (args.length() > 0 && !args.isNull(0)) {
                String eventName = null;
                Map<String,Object> attributes = null;
                eventName = args.getString(0);
                if (args.length() == 2 && args.get(1) instanceof JSONObject) {
                    try {
                        attributes = (Map<String, Object>)fromJSON(args.getJSONObject(1));
                    } catch (JSONException e) {

                    }
                }
                Logger.d(TAG, eventName + " " + attributes);
                if (eventName != null) {
                    if (attributes == null) {
                        WebEngage.get().analytics().track(eventName);
                    } else {
                        WebEngage.get().analytics().track(eventName, attributes);
                    }
                }
            }
        } else if ("setAttribute".equals(action)) {
            JSONObject customAttr = new JSONObject();
            UserProfile.Builder userProfileBuilder = new UserProfile.Builder();
            if (args.length() == 1 && args.get(0) instanceof JSONObject) {
                JSONObject attributes = null;
                attributes = args.getJSONObject(0);
                if (attributes != null) {
                    Iterator<String> iterator = attributes.keys();
                    while( iterator .hasNext()) {
                        String key = iterator.next();
                        try {
                            Object value = attributes.get(key);
                            filterSystemAndCustomAttributes(key, value, customAttr, userProfileBuilder);
                        } catch (JSONException e) {

                        }
                    }
                }
            } else if (args.length() == 2 && !args.isNull(0)) {
                filterSystemAndCustomAttributes(args.getString(0), args.get(1), customAttr, userProfileBuilder);
            }
            Map<String, Object> filteredCustomAttributes = null;
            try {
                filteredCustomAttributes = (Map<String, Object>) fromJSON(customAttr);
            } catch (JSONException e) {

            }
            if (filteredCustomAttributes!= null && filteredCustomAttributes.size() > 0) {
                WebEngage.get().user().setAttributes(filteredCustomAttributes);
            }
            WebEngage.get().user().setUserProfile(userProfileBuilder.build());
        } else if ("screenNavigated".equals(action)) {
            if (args.length() > 0) {
                String screenName = null;
                Map<String,Object> screenData = null;
                screenName = args.isNull(0) ? null : args.getString(0);
                if (args.length() == 2 && args.get(1) instanceof JSONObject) {
                    try {
                        screenData = (Map<String, Object>)fromJSON(args.getJSONObject(1));
                    } catch (JSONException e) {

                    }
                }
                if (screenName != null) {
                    if (screenData == null) {
                        WebEngage.get().analytics().screenNavigated(screenName);
                    } else {
                        WebEngage.get().analytics().screenNavigated(screenName, screenData);
                    }
                } else {
                    if (screenData != null) {
                        WebEngage.get().analytics().setScreenData(screenData);
                    }
                }  
            }
        } else if ("login".equals(action)) {
            if (args.length() == 1 && args.get(0) instanceof String) {
                WebEngage.get().user().login(args.getString(0));
            }
        } else if ("logout".equals(action)) {
            WebEngage.get().user().logout();
        }

        return true;
    }

    private void filterSystemAndCustomAttributes(String key, Object value, JSONObject customAttr, UserProfile.Builder userProfileBuilder) {
        if (FIRST_NAME.equals(key) && value instanceof String) {
            userProfileBuilder.setFirstName((String) value);
        } else if (LAST_NAME.equals(key) && value instanceof String) {
            userProfileBuilder.setLastName((String) value);
        } else if (EMAIL.equals(key) && value instanceof String) {
            userProfileBuilder.setEmail((String) value);
        } else if (BIRTH_DATE.equals(key) && value instanceof String) {
            try {
                String bDate = (String) value;
                if (bDate.length() == "yyyy-MM-dd".length()) {
                    int year = Integer.valueOf(bDate.substring(0,4));
                    int month = Integer.valueOf(bDate.substring(5,7));
                    int day = Integer.valueOf(bDate.substring(8));
                    userProfileBuilder.setBirthDate(year, month, day);
                }
            } catch (Exception e) {

            }
        } else if (PHONE.equals(key) && value instanceof String) {
            userProfileBuilder.setPhoneNumber((String) value);
        } else if (GENDER.equals(key) && value instanceof String) {
            userProfileBuilder.setGender(Gender.valueByString((String) value));
        } else if (COMPANY.equals(key) && value instanceof String) {
            userProfileBuilder.setCompany((String) value);
        } else if (HASHED_EMAIL.equals(key)) {
            userProfileBuilder.setHashedEmail((String) value);
        } else if (HASHED_PHONE.equals(key)) {
            userProfileBuilder.setHashedPhoneNumber((String) value);
        } else {
            try {
                customAttr.put(key, value);
            } catch (JSONException e) {

            } 
        }
    }

    @Override
    public void onStart() {
        Logger.d(TAG,"Activity Start");
        WebEngage.get().analytics().start(cordova.getActivity());
        super.onStart();
    }
    
    @Override
    public void onStop() {
        Logger.d(TAG,"Activity Stop");
        WebEngage.get().analytics().stop(cordova.getActivity());
        super.onStop();
    }

    @Override
    public PushNotificationData onPushNotificationReceived(Context context, PushNotificationData notificationData) {
        if (pushOptions.get(PUSH_SOUND) != null && (Boolean)pushOptions.get(PUSH_SOUND) == true) {
            notificationData.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));
        }
        if (pushOptions.get(PUSH_VIBRATION) != null && (Boolean)pushOptions.get(PUSH_VIBRATION) == true) {
            notificationData.setVibrateFlag(true);
        }
        if (pushOptions.get(PUSH_SHOULD_RENDER) != null) {
            notificationData.setShouldRender((Boolean)pushOptions.get(PUSH_SHOULD_RENDER));
        }
        return notificationData;
    }

    public static void handlePushClick(String uri, Bundle data) {
        IS_PUSH_CALLBACK_PENDING = true;
        PENDING_PUSH_URI = uri;
        PENDING_PUSH_CUSTOM_DATA = bundleToJson(data);
        Logger.d(TAG, "handlePushClick invoked");
    }

    @Override
    public void onPushNotificationShown(Context context, PushNotificationData notificationData) {
    }

    @Override
    public boolean onPushNotificationClicked(Context context, PushNotificationData notificationData) {
        String uri = notificationData.getPrimeCallToAction().getAction();
        JSONObject customData = bundleToJson(notificationData.getCustomData());
        webView.sendJavascript("javascript:webengage.push.onCallbackReceived( 'click', '" + uri + "'," + customData + ");");
        return false;
    }

    @Override
    public boolean onPushNotificationActionClicked(Context context, PushNotificationData notificationData, String buttonID) {
        String uri = notificationData.getCallToActionById(buttonID).getAction();
        JSONObject customData = bundleToJson(notificationData.getCustomData());
        webView.sendJavascript("javascript:webengage.push.onCallbackReceived( 'click', '" + uri + "'," + customData + ");");
        return false;
    }

    @Override
    public void onPushNotificationDismissed(Context context, PushNotificationData notificationData) {

    }

    @Override
    public InAppNotificationData onInAppNotificationPrepared(Context context, InAppNotificationData notificationData) {
        if (inappOptions.get(INAPP_SHOULD_RENDER) != null) {
            notificationData.setShouldRender((Boolean)inappOptions.get(INAPP_SHOULD_RENDER));
        }
        return notificationData;
    }

    @Override
    public void onInAppNotificationShown(Context context, InAppNotificationData notificationData) {
        webView.sendJavascript("javascript:webengage.notification.onCallbackReceived( 'shown', " + notificationData.getData() + ");");
    }

    @Override
    public void onInAppNotificationDismissed(Context context, InAppNotificationData notificationData) {
        webView.sendJavascript("javascript:webengage.notification.onCallbackReceived( 'dismiss', " + notificationData.getData() + ");");
    }

    @Override
    public boolean onInAppNotificationClicked(Context context, InAppNotificationData notificationData, String actionId) {
        webView.sendJavascript("javascript:webengage.notification.onCallbackReceived( 'click', " + notificationData.getData() + ",'" + actionId + "');");
        return false;
    }

    @Override
    public void onGCMRegistered(Context context, String regID) {
        Logger.d(TAG, regID);
    }

    @Override
    public void onGCMMessageReceived(Context context, Intent intent) {
        Logger.d(TAG, intent.getExtras().toString());
    }

    @Override
    public void onAppInstalled(Context context, Intent intent) {
        Logger.d(TAG + "Install Referrer", intent.getExtras().getString("referrer"));
    }

    @Override
    public void onAppUpgraded(Context context, int oldVersion, int newVersion) {
    }

    private static JSONObject bundleToJson(Bundle bundle) {
        if (bundle != null) {
            JSONObject result = new JSONObject();
            for(String key : bundle.keySet()) {
                try {
                    result.put(key, bundle.get(key));
                } catch (JSONException e) {

                }
            }
            return result;
        }
        return null;
    }

    private Object fromJSON(Object obj) throws JSONException {
        if (obj == null || obj == JSONObject.NULL) {
            return null;
        } else if (obj instanceof JSONObject) {
            return toMap((JSONObject) obj);
        } else if (obj instanceof JSONArray) {
            return toList((JSONArray) obj);
        } else if (obj instanceof String) {
            String value = (String) obj;
            if (value.length() == "yyyy-MM-ddTHH:mm:ss.SSSZ".length()) {
                try {
                    SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                    simpleDateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
                    return simpleDateFormat.parse(value);
                } catch (Exception e) {
                    return value;
                }
            }
        }
        return obj;
    }

    private Map<String, Object> toMap(JSONObject json) throws JSONException{
        Map<String, Object> map = new HashMap<String, Object>();
        Iterator<String> iterator = json.keys();
        while(iterator.hasNext()) {
            String key = iterator.next();
            Object value = fromJSON(json.get(key));
            map.put(key, value);
        }
        return map;
    }

    private List<Object> toList(JSONArray jsonArray) throws JSONException {  
        List<Object> list = new ArrayList<Object>();
        for(int i =0 ; i < jsonArray.length(); i++) {
            Object value = fromJSON(jsonArray.get(i));
            list.add(value);
        }
        return list;
    }
}

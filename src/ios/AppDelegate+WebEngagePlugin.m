#import <WebEngage/WebEngage.h>
#import "AppDelegate+WebEngagePlugin.h"

@interface WebEngagePluginUtils : NSObject

+ (instancetype)sharedInstance;
@property (atomic, readwrite) BOOL freshLaunch;

@end

@implementation WebEngagePluginUtils

+ (instancetype)sharedInstance {
    static WebEngagePluginUtils *sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^ {
        sharedInstance = [[self alloc] init];
    });
    return sharedInstance;
}

@end

@implementation AppDelegate (WebEngagePlugin)

+ (void)load {
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(applicationFinishedLaunching:)
                                                 name:UIApplicationDidFinishLaunchingNotification object:nil];
}

+ (void)applicationFinishedLaunching:(NSNotification *)notification {
    AppDelegate* appDelegate = [UIApplication sharedApplication].delegate;
    @synchronized (appDelegate) {
        [WebEngagePluginUtils sharedInstance].freshLaunch = YES;
    }

    WebEngagePlugin* webEngagePlugin = [WebEngagePlugin webEngagePlugin];
    
    id apnsRegistration = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"WEGApnsAutoRegister"];
    
    BOOL autoRegister = YES;
    if (apnsRegistration != nil) {
        autoRegister = [apnsRegistration boolValue];
    }
    [[WebEngage sharedInstance] application:notification.object
              didFinishLaunchingWithOptions:notification.userInfo
                       notificationDelegate:webEngagePlugin
                               autoRegister:autoRegister];
}

- (void)WEGHandleDeeplink:(NSString *)deeplink userData:(NSDictionary *)pushData {
    WebEngagePlugin* webEngagePlugin = [WebEngagePlugin webEngagePlugin];
    
    if (webEngagePlugin && webEngagePlugin.webView) {
        
        AppDelegate* appDelegate = [UIApplication sharedApplication].delegate;
        
        @synchronized (appDelegate) {
            
            WebEngagePluginUtils* webEngagePluginUtils = [WebEngagePluginUtils sharedInstance];
            //Case where push notification is clicked from App background
            if (!webEngagePluginUtils.freshLaunch) {
                
                [WebEngagePlugin evaluateJavaScript:@"webengage.push.clickCallback !== undefined && webengage.push.clickCallback != null?true: false;" onWebView:webEngagePlugin.webView completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
                    
                    //This is invocation from background. Check if the callback is registered.
                    if ([response isEqualToString: @"1"]) {
                        
                        //case where app is invoked from background and click callback is registered
                        NSData* data = [NSJSONSerialization dataWithJSONObject:pushData options:0 error:nil];
                        NSString* pushDataJSON = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
                        
                        [webEngagePlugin.commandDelegate evalJs:
                         [NSString stringWithFormat:@"webengage.push.onCallbackReceived( 'click', %@, '%@')",
                          pushDataJSON, deeplink]];
                    } else {
                        
                        NSURL* url = [NSURL URLWithString:deeplink];
                        if (url) {
                            dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
                                [[UIApplication sharedApplication] openURL:url];
                            });
                        }
                    }
                }];
            } else {
                webEngagePlugin.pendingDeepLinkCallback = [@{@"deepLink": deeplink,
                                                             @"info": pushData} mutableCopy];
            }
        }
    }
}

- (BOOL)isFreshLaunch {
    return [WebEngagePluginUtils sharedInstance].freshLaunch;
}

- (void)setFreshLaunch:(BOOL)freshLaunch {
    [WebEngagePluginUtils sharedInstance].freshLaunch = freshLaunch;
}

@end

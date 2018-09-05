#import "AppDelegate.h"
#import "WebEngagePlugin.h"

@interface AppDelegate (WebEngagePlugin)

- (BOOL)isFreshLaunch;
- (void)setFreshLaunch:(BOOL)freshLaunch;

@end

console.log("user.js")
console.log(app)
app = (function ($, app, document) {
    app = app || {};
    app.user = app.user || {};

    app.user.login = function (username, onSuccess, onError) {
        Parse.User.logIn(username, username, {
            success: onSuccess,
            error: onError
        });
    }

    app.user.signup = function (username, onSuccess) {
        app.log("signup user: " + username);
        app.ga.trackEvent(app.log, app.log, "App","User SignUp", username, 0);
        var user = new Parse.User();
        user.set("username", username);
        user.set("password", username);
        user.set("contacts_saved", false);
        user.set("contacts_allowed", false);
        user.set("contact_count", null);

        user.signUp(null, {
            success: function (user) {
                var UserData = Parse.Object.extend("UserData");
                var o = new UserData();
                o.save({
                    user: user,
                    status: "nuevo"
                });
                onSuccess(user);
            },
            error: function (user, error) {
                // Show the error message somewhere and let the user try again.
                app.log("Error: " + error.code + " " + error.message);
            }
        });
    }

    app.user.login_or_signup = function (username, onSuccess) {
        app.log("logging in as user: " + username);
        app.user.login(username, onSuccess, function (user, error) {
            app.log(error);
            app.user.signup(username, onSuccess);
        });
    }

    app.user.set_current_user = function (user) {
        app.user.current = user;
        app.user.contacts_saved = app.user.current.get("contacts_saved");
    }


    app.user.get_username_from_device = function (onSuccess) {
        app.deviceInfo = app.storage.get("deviceInfo", "");
        if (app.deviceInfo === "") {
            // set the default bailout
            app.deviceInfo = globals.app_name + ":" + app.utils.guid();
            app.storage.set("deviceInfo", app.deviceInfo);
            try {
                var devInfo = cordova.require("cordova/plugin/DeviceInformation");
                devInfo.get(function (result_str) {
                    app.log(result_str);
                    eval("var res = " + result_str);
                    app.log(res);
                    if (res) {
                        var userEmail = "";
                        var id = res.deviceID;
                        var i = 0;
                        while (res.hasOwnProperty("account" + i + "Name")) {
                            if (res["account" + i + "Name"].indexOf("@") >= 0) {
                                userEmail = res["account" + i + "Name"];
                                break;
                            }
                            i++;
                        }
                        if (userEmail !== "") {
                            app.deviceInfo = userEmail;
                        } else if (id !== undefined && id !== "") {
                            app.deviceInfo = id;
                        }
                        app.deviceInfo = globals.app_name + ":" + app.deviceInfo
                        app.storage.set("deviceInfo", app.deviceInfo);
                    }

                    onSuccess(app.deviceInfo);
                }, function () {
                    onSuccess(app.deviceInfo);
                });
            } catch (e) {
                app.log("failed to load deviceInfo plugin");
                onSuccess(app.deviceInfo);
            }
        } else {
            onSuccess(app.deviceInfo);
        }
    }
    return app;
}($, app, document));


//{
//    account0Name: 'nirsancho@gmail.com',
//    account0Type: 'com.google',
//    account1Name: 'WhatsApp',
//    account1Type: 'com.whatsapp',
//    account2Name: 'Waze',
//    account2Type: 'com.waze',
//    account3Name: 'SyncAdapterAccount',
//    account3Type: 'com.yahoo.mobile.client.android.weather.account',
//    account4Name: 'nirsancho@gmail.com',
//    account4Type: 'com.dropbox.android.account',
//    account5Name: 'nirsancho',
//    account5Type: 'com.skype.contacts.sync',
//    account6Name: '+972545480866',
//    account6Type: 'com.viber.voip.account',
//    deviceID: '359778042868131',
//    phoneNo: 'TM.ERROR',
//    netCountry: 'il',
//    netName: 'HOT mobile',
//    simNo: '8997207103100954405',
//    simCountry: 'il',
//    simName: 'HOT mobile'
//}

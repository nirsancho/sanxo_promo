console.log("main.js")
console.log(app)
var g_debug = true;

function isConnected() {
    app.log("checkConnection()");
    if (app && app.isPhonegap && navigator && navigator.connection.type) {

        var networkState = navigator.connection.type;
        //        var states = {};
        //        states[Connection.UNKNOWN] = 'Unknown connection';
        //        states[Connection.ETHERNET] = 'Ethernet connection';
        //        states[Connection.WIFI] = 'WiFi connection';
        //        states[Connection.CELL_2G] = 'Cell 2G connection';
        //        states[Connection.CELL_3G] = 'Cell 3G connection';
        //        states[Connection.CELL_4G] = 'Cell 4G connection';
        //        states[Connection.CELL] = 'Cell generic connection';
        //        states[Connection.NONE] = 'No network connection';
        return (networkState != Connection.NONE);
    } else {
        return true;
    }

}

function install_debug(debug_url) {
    var e = document.createElement("script");
    e.setAttribute("src", debug_url + "/target/target-script.js#anonymous");
    document.getElementsByTagName("body")[0].appendChild(e);
}

function global_catch(err) {
    setTimeout(function () {
        console.log("Cathed error");
        console.log(err);
    }, 5000);
    app.log(err);
}

app = (function ($, app, document) {
    app = app || {};
    app.load_timestamp = new Date().getTime();
    app.ver = "1.0.5";
    app.debug_url = "http://192.168.1.100:1234/"
    app.lang = "es";
    app.is_dev = false;
    app.isPhonegap = (function () {
        return document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1;
    })();

    if (app.isPhonegap && g_debug) {
        install_debug(app.debug_url);
    }

    app.url = (function () {
        return document.location.origin + "/";
    }());

    app.deviceInfo = "";


    app.refreshData = true;
    app.manualEnhace = false;

    app.ga = {
        trackEvent: function (success, fail, category, action, label, val) {
            app.log("simulating GA EVENT: " + category + ", " + action + ", " + label + ", " + val);
            if (success) {
                success();
            }
        },
        trackPage: function (success, fail, pageURL) {
            app.log("simulating GA TrackPage: " + pageURL);
            if (success) {
                success();
            }
        },
        exit: function (success, fail) {
            app.log("simulating GA: exit()");
            if (success) {
                success();
            }
        },
        init: function (success, fail) {
            app.log("simulating GA: init()");
            if (success) {
                success();
            }
        }
    }

    app.init = function () {
        app.log("app.init");
        var app_init = function () {
            app.log("var app_init");
            try {
            app.log('loading version: ' + app.ver);
            app.deviceInfo = app.storage.get("deviceInfo", "");
                if (!isConnected()) {
                    app.log("not connected to internet");
                    navigator.notification.alert('Para continuar, por favor conectese a internet.', function () {
                        navigator.app.exitApp();
                    }, "No hay conexion");
                    return;
                }

            document.addEventListener("backbutton", function (e) {
                var active_page = $.mobile.pageContainer.pagecontainer("getActivePage")[0].id;
                app.log("BackButton: " + active_page)
                    app.ga.trackEvent(app.log, app.log, "App", "Button", "Back", 0);
                //                navigator.app.backHistory()
                e.preventDefault();
                    if (active_page == 'page-0' || active_page == "page-loading") {
                        var log_and_exit = function (str) {
                            app.log(str);
                            navigator.app.exitApp();
                        }
                        var ga_exit = function() {
                            app.ga.exit(log_and_exit, log_and_exit);
                        }

                        app.ga.trackEvent(ga_exit, ga_exit, "App", "exit", "exit", 0);

                        setTimeout(navigator.app.exitApp, 1000);
                    } else {
                        navigator.app.backHistory()
                    }
            }, false);

            $(document).bind("pagebeforecreate", app.pagebeforecreate);

            $("body").on("click", "input[type=text], input[type=number], input[type=password]", function () {
                this.setSelectionRange(0, $(this).val().length);
            })



            app.parse.setup();

            //            navigator.notification.beep(1);

            app.user.get_username_from_device(function () {
                $("#form-email").val(app.userEmail);


                app.user.login_or_signup(app.deviceInfo, function (user) {
                        app.ga.trackEvent(app.log, app.log, "App", "User Login", app.deviceInfo, 0);
                    app.user.set_current_user(user);
                    var contacts_saved = app.user.current.get("contacts_saved");
                    if (contacts_saved == false) {
                        app.contacts.get_all();
                        if (app.is_dev) {
                                navigator.notification.alert('Uploading all contacts', null, "Dev Message");
                        }
                    }
                });
            });
            } catch (err) {
                global_catch(err);
            }
        };

        $(function () {
            app.log("app.jquery.ready");
            try {
                if (app.isPhonegap) {
                    var init_ga = function () {
                        app.log("init ga");
                        if (window.plugins && window.plugins.gaPlugin) {
                            window.plugins.gaPlugin.init(function (str) {
                                app.ga = window.plugins.gaPlugin;
                                app.log(str);
                                app.ga.trackEvent(app.log, app.log, "App", "Loaded", "NA", 0);
                                app_init();
                            }, app_init, globals.google_analytics, 5);
                        } else {
                            app.log("GA init failed, loading app");
                            app_init();
                        }
                    }

                    if (window.plugins && window.plugins.gaPlugin) {
                        init_ga();
                    } else {
                        setTimeout(init_ga, 1000);
                    }
                } else {
                    app.log("not phonegap");
                    app_init();
                }
            } catch (err) {
                global_catch(err);
            }
        });
    };

    app.logbook = [];
    app.log = function (str) {
        if (typeof str == "string") {
            str = parseInt((new Date().getTime() - app.load_timestamp) / 1000) + ": " + str;
            if (g_debug) {
                if (app.logbook.length == 0) {
                    app.logbook = app.storage.get("logbook", []);
                    app.logbook.push("----- NEW SESSION ----");
                }

                app.logbook.push(str);
                app.storage.set("logbook", app.logbook);
            }
        }
        console.log(str);
        // app.logbook.push(str);
    };

    app.compile = function () {

        app.log("app compiling " + app.currentPage);
        app.ga.trackPage(app.log, app.log, app.currentPage);
        app.ga.trackEvent(app.log, app.log, "App", "Page", app.currentPage, 0);
        $("[data-text]:not([data-text-compiled])").each(function (i, item) {
            $(item).text(app.translate($(item).attr("data-text")));
            $(item).attr("data-text-compiled", "true");
        });

        $("[data-text-placeholder]:not([data-text-placeholder-compiled])").each(function (i, item) {
            $(item).prop("placeholder", app.translate($(item).attr("data-text-placeholder")));
            $(item).attr("data-text-placeholder-compiled", "true");
        });

    };

    app.translate = function (key, lang) {
        var texts = app.text[app.lang || lang] || [];
        return texts[key] || key;
    };

    app.currentPage = "";
    app.pagebeforecreate = function (event) {
        if (app.currentPage === $(event.target).attr("id")) {
            return false;
        } else {
            app.currentPage = $(event.target).attr("id");
        }
        $("body").css("background", "#f9f9f9");
        app.compile();
        return true;
    };

    app.utils = {};

    app.utils.formatCurrency = function (value) {
        return Number(value).toFixed(2) + ' ש"ח';
    };
    app.utils.formatDate = function (value, forDateInput) {
        var d = new Date(value);
        forDateInput = forDateInput || false;
        if (forDateInput) {
            return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
        } else {
            return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
        }
    };
    app.utils.guid = function () {
        return ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        }));
    }


    app.service = function (service, data, successFunction, options) {
        var async;
        var request = {
            "request-type": service,
            data: data,
            dummy: (new Date()).getTime()
        };
        var ajax_handler;

        //        app.log("Service: " + service);
        //        app.log(data);

        options = options || {};
        if (successFunction === undefined) {
            successFunction = function (data) {
                app.log(data);
            };
            async = true;
        } else if (successFunction === "deferred") {
            successFunction = null;
            async = true;
        } else if (successFunction === "sync") {
            successFunction = null;
            async = false;
        } else {
            async = true;
        }


        options = $.extend({
            type: 'POST',
            url: app.url + "services.php",
            crossDomain: true,
            xhrFields: {
                withCredentials: true
            },
            dataType: 'json',
            data: request,
            success: successFunction,
            error: function (jqXHR, textStatus, errorThrown) {
                app.error("Service (" + service + ") Error:" + textStatus);
            },
            async: async
        }, options);

        ajax_handler = $.ajax(options);
        return ajax_handler;
    };

    app.storage = {
        isInit: false,
        db_name: globals.app_name + "_db",
        database: {},
        set: function (key, value) {
            if (!app.storage.isInit) {
                this.load_db_from_localStorage();
            }

            this.database[key] = value;
            this.save_db_in_localStorage();
            return true;
        },
        get: function (key, default_value) {
            if (!app.storage.isInit) {
                this.load_db_from_localStorage();
            }

            if (this.database.hasOwnProperty(key)) {
                return this.database[key];
            } else {
                return default_value;
            }
        },
        load_db_from_localStorage: function () {
            var json_db = localStorage[this.db_name] || "{}";
            this.database = JSON.parse(json_db);
            this.isInit = true;
        },
        save_db_in_localStorage: function () {
            var json_db = JSON.stringify(this.database);
            localStorage[this.db_name] = json_db;
        }
    };

    app.error = function (msg, options, buttons) {
        buttons = buttons || {};
        options = $.extend({
            timeout: 3000
        }, options);
        var $errorContainer;

        $errorContainer = $('<div>').simpledialog2({
            mode: 'button',
            headerText: 'שגיאה',
            headerClose: true,
            buttonPrompt: msg,
            themeDialog: "c",
            themeHeader: "e",
            buttons: buttons
            //            buttons : {
            //                'OK': {
            //                    click: function () {
            //                        $('#buttonoutput').text('OK');
            //                    }
            //                },
            //                'Cancel': {
            //                    click: function () {
            //                        $('#buttonoutput').text('Cancel');
            //                    },
            //                    icon: "delete",
            //                    theme: "c"
            //                }
            //            }
        });

        if (options.timeout > 0) {
            window.setTimeout(function () {
                if ($.mobile.sdCurrentDialog !== undefined) {
                    $.mobile.sdCurrentDialog.close();
                }
            }, options.timeout);
        }

    };


    $(document).on("pagecontainerload", function (event, ui) {
        app.log("pagecontainerload");
        $(ui.toPage).trigger("create")
    })

    return app;
}($, app, document));

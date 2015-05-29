app = app || {};
app.loader.is_phonegap = document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1;
app.loader.scripts_loaded = false;
app.loader.device_ready = !app.loader.is_phonegap;
app.loader.loaded_scripts = 0;
app.loader.fire_init = function () {
    if (scripts_loaded && device_ready) {
        callback();
    }
}

app.loader.loadScripts = function (scripts, callback) {
    if (app.loader.is_localhost) {
        $.ajaxSetup({
            cache: true
        });
    }

    var scripts = scripts || [];
    if (scripts.length == 0) {
        app.loader.scripts_loaded = true;
        app.loader.callback();
    }
    for (var i = 0; i < scripts.length; i++) {
        var done_cb = (function (script_name) {
            return (function (script, status) {
                app.loader.loaded_scripts++;
                console.log("done running " + script_name + " loaded_scripts: " + app.loader.loaded_scripts);
                if (app.loader.loaded_scripts  == scripts.length) {
                    app.loader.scripts_loaded = true;
                    app.loader.callback();
                }
            })
        })(scripts[i]);


        console.log("loading " + scripts[i]);
        $.getScript(app.loader.basepath + scripts[i]).done(done_cb).fail(function(e){console.log(e)});
    }
};

if (app.loader.is_phonegap) {
    document.addEventListener("deviceready", function () {
        app.loader.device_ready = true;
        app.loader.fire_init();
    }, false);
}
$(function () {
    app.loader.loadScripts(app.loader.scripts);
});

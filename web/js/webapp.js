console.log("webapp.js")
console.log(app);

function get_from_array(arr, index, def_val) {
    try {
        return (arr[index] || def_val);
    } catch (e) {
        return (def_val);
    }
}

function loading_hide() {
    $.mobile.loading("hide")
}
app = (function ($, app, document) {
    app = app || {};
    app.user.get_contacts = function (useridx, phonesOnly, cb) {
        $.mobile.loading("show", {
            text: "Bajando",
            textVisible: true,
        });

        var RawContacts = Parse.Object.extend("RawContacts");
        var query = new Parse.Query(RawContacts);
        query.equalTo("owner", app.user.list[useridx]);
        query.find().done(function (result) {
            if (result) {
                var allcontacts = $.map(result, function (o) {
                    return o.get("raw_contacts");
                });

                var tabContacts = $.map(allcontacts, function (o) {
                    var contact = {};
                    contact.name = o.displayName || "";
                    contact.phone1 = get_from_array(o.phoneNumbers, 0, "");
                    contact.phone2 = get_from_array(o.phoneNumbers, 1, "");

                    contact.email0 = get_from_array(o.emails, 0, "");
                    contact.email1 = get_from_array(o.emails, 1, "");

                    return contact;
                });

                if (phonesOnly) {
                    tabContacts = $.grep(tabContacts, function (item, i) {
                        return (item.phone1 != "" || item.phone2 != "");
                    });
                }

                var filename = app.user.list[useridx].get("username");
                filename = filename || app.user.list[useridx].id;
                dataToExcel(tabContacts, filename + ".xls", true);
            }
        }).fail(function () {
            $.mobile.loading("hide")
        });
    };

    //    app.user.list[useridx]
    app.user.remove = function (user_idx, cb) {
        $.mobile.loading("show", {
            text: "Borrando",
            textVisible: true,
        });

        var user = app.user.list[user_idx];
        var RawContacts = Parse.Object.extend("RawContacts");
        var query = new Parse.Query(RawContacts);
        query.equalTo("owner", user);
        query.find().done(function (results) {
            if (results) {
                for (var res_idx in results) {
                    var result = results[res_idx];
                    app.log('destroying result: ' + result.id);
                    result.destroy();
                }
            }

            if (app.user.userData[user.id]) {
                app.log('destroying user data');
                app.user.userData[user.id].destroy();
                delete app.user.userData[user.id];
            }

            app.log('destroying user');

            app.user.login(user.get("username"), function (user) {
                user.destroy().then(function () {
                    delete app.user.list[user_idx];
                    Parse.User.logIn("admin", app.storage.get("pass", "")).done(function () {
                        app.user.getall();
                        loading_hide();
                    });
                }).fail(loading_hide);

            }, function (user, error) {
                app.log(error);
                loading_hide();
            });


        }).fail(loading_hide);
    };


    app.user.getall = function (cb) {
        var Users = Parse.Object.extend("_User");
        var query = new Parse.Query(Users);
        query.limit(1000).find().done(function (allusers) {
            app.user.list = allusers;
            var UserData = Parse.Object.extend("UserData");
            var query = new Parse.Query(UserData);
            query.limit(1000).find().done(function (userData) {
                app.user.userData = {};
                for (var data in userData) {
                    data = userData[data];
                    app.user.userData[data.get("user").id] = data;
                }

                var user_count = allusers.length;
                var contact_count = 0;
                var contact_count_allowed = 0;
                var user_count_allowed = 0;

                var rr = $.map(allusers, function (r1, index) {
                    contact_count += r1.get("contact_count");
                    if (r1.get("contacts_allowed")) {
                        contact_count_allowed += r1.get("contact_count");
                        user_count_allowed++;
                    }

                    var status = "<input class='user-status' data-index='" + index + "' value='" + (app.user.userData[r1.id] ? (app.user.userData[r1.id].get("status") || "") : "") + "'/>";
                    var download = "<button class='user-download' data-index='" + index + "' data-text='general-download'></button>";
                    var remove = r1.get("username") == "admin" ? "" : "<button class='user-remove' data-index='" + index + "' data-text='general-remove'></button>";
                    var save = "<button class='user-save' data-index='" + index + "' data-text='general-save'></button>";
                    var cancel = "<button class='user-cancel' data-index='" + index + "' data-text='general-cancel'></button>";
                    var createdAt = "<span title='" + moment(r1.createdAt).format("HH:mm DD/MM/YY") + "'>" + moment(r1.createdAt).format("DD/MM/YY") + "</span>"
                    return [[r1.get("username"), r1.get("contacts_allowed") ? "Si" : "No",
                          r1.get("contact_count"),
                         status, createdAt, download + save + cancel + remove, r1.get("contacts_saved") ? "Si" : "No", r1.id]];
                });

                $("[data-text=user_count_allowed]").text(user_count_allowed);
                $("[data-text=contact_count_allowed]").text(contact_count_allowed);
                $("[data-text=user_count_total]").text(user_count);
                $("[data-text=contact_count_total]").text(contact_count);

                //  $('#users').parent().prepend("<div style='margin:10px'><b>Total users: </b>" + user_count + ", <b>Total Contacts: </b>" + contact_count + "</div>");

                if (app.usertable) {
                    $('#users').DataTable().destroy();
                }

                /* Create an array with the values of all the input boxes in a column */
                $.fn.dataTable.ext.order['dom-text'] = function (settings, col) {
                    return this.api().column(col, {
                        order: 'index'
                    }).nodes().map(function (td, i) {
                        return $('input', td).val();
                    });
                }

                $.fn.dataTable.ext.order['dom-date'] = function (settings, col) {
                    return this.api().column(col, {
                        order: 'index'
                    }).nodes().map(function (td, i) {
                        return moment($('span', td).attr("title"), "HH:mm DD/MM/YY").format("YYMMDDHHmm");
                    });
                }

                app.usertable = $('#users').dataTable({
                    retrieve: true,
                    "data": rr,
                    "autoWidth": false,
                    "paging": false,
                    "pageLength": 999999,
                    "order": [[4, "desc"]],
                    "columns": [

                        {
                            "title": "Username"
                    },
                        {
                            "title": "allowed"
                    },

                        {
                            "title": "count",
                    },
                        {
                            "title": "Status",
                            "orderDataType": "dom-text",
                            type: 'string'
                    },
                        {
                            "title": "Creado En",
                            "orderDataType": "dom-date",
                            type: 'string'
                    },
                        {
                            "title": "Acciones",
                            "orderable": false,
                    },
                        {
                            "title": "saved",
                    },
                        {
                            "title": "Id"
                    },
                            ],
                    "initComplete": function () {
                        $(".user-save", $("#users")).hide();
                        $(".user-cancel", $("#users")).hide();
                        $(".user-status", $("#users")).keypress(function () {
                            app.log("change");
                            var $tr = $(this).closest("tr");
                            $(".user-save", $tr).show();
                            $(".user-cancel", $tr).show();
                            $(".user-download", $tr).hide();
                            $(".user-remove", $tr).hide();
                        });
                        app.compile();
                        app.log("table drawed");
                    }
                });

                $('#users tbody .user-download').click(function () {
                    var idx = $(this).attr("data-index");
                    if (idx) {
                        var phonesOnly = $("#cb_phonesOnly").prop("checked");
                        app.user.get_contacts(idx, phonesOnly);
                    }
                });


                $('#users tbody .user-remove').click(function () {
                    var idx = $(this).attr("data-index");
                    if (idx) {
                        var res = confirm("Seguro borrar usuario " + app.user.list[idx].get("username"))
                        if (res) {
                            app.user.remove(idx);
                        }
                    }
                });

                $('#users tbody .user-cancel').click(function () {
                    var idx = $(this).attr("data-index");
                    if (idx) {
                        var $tr = $(this).closest("tr");
                        var userId = app.user.list[idx].id;
                        $(".user-status", $tr).val(app.user.userData[userId].get("status"));
                        $(".user-save", $("#users")).hide();
                        $(".user-cancel", $("#users")).hide();
                        $(".user-download", $tr).show();
                        $(".user-remove", $tr).show();
                    }
                });

                $('#users tbody .user-save').click(function () {
                    var idx = $(this).attr("data-index");
                    if (idx) {
                        var $tr = $(this).closest("tr");
                        var userId = app.user.list[idx].id;
                        app.user.userData[userId].set("status", $(".user-status", $tr).val());
                        app.user.userData[userId].save().done(function () {
                            $(".user-save", $("#users")).hide();
                            $(".user-cancel", $("#users")).hide();
                            $(".user-download", $tr).show();
                        });
                    }
                });

            }); // end of userData
        }); // end of _User
    }
    app.edit_page = function (id, page) {
        $("#page-title").val(page.title || "approval");
        $("#page-image").val(page.image || "");
        app.editor.setContent(page.body || "");

        app.currentPage = id;
        if (id == "approval") {
            $("#question").val(page.question);
            $("#dialog").val(page.dialog);
            $("#dialog-title").val(page["dialog_title"]);
            $("#url").val(page.url);
        }
    };

    app.save_content = function (content) {
        var i = parseInt(app.currentPage);
        if (i < app.content.pages.length) {
            app.log("saving page " + app.currentPage);
            app.content.pages[i].title = $("#page-title").val();
            app.content.pages[i].image = $("#page-image").val();
            app.content.pages[i].enabled = true;
            app.content.pages[i].body = content;
            $("#pages > option[data-index="+i+"]").text("Pagina " + (i + 1) + ": " + app.content.pages[i].title)
            $("#pages").selectmenu('refresh');
        } else {
            app.log("saving approval");
            app.content.approval.body = content;
            app.content.approval.question = $("#question").val();
            app.content.approval.dialog = $("#dialog").val();
            app.content.approval["dialog_title"] = $("#dialog-title").val();
            app.content.approval.url = $("#url").val();
        }
        app.config.set("content_es", app.content);
    }

    app.webinit = function () {
        app.log("webinit on!");
        app.content.create_pages = function (pages, approval) {
            new nicEditor({
                fullPanel: true,
                iconsPath: "js/nicEditorIcons.gif",
                uploadURI: "nicUpload.php",
            }).panelInstance('page-content');
            app.editor = nicEditors.findEditor('page-content');
            $(".nicEdit-panelContain").parent().css("width", "100%").next().css("width", "100%").children().first().css("width", "100%");

            $("#page-image").change(function () {
                var src = $("#page-image").val()
                $("#page-image-preview").attr("src", src)
                if (src == "") {
                    $("#page-image-preview").hide();
                } else {
                    $("#page-image-preview").show();
                }
            });

            var $selector = $("#pages");
            $.each(pages, function (index, page) {
                var o = $("<option></option>").text("Pagina " + (index + 1) + ": " + page.title).attr("data-index", index);
                $selector.append(o);
            });

            var o = $("<option></option>").text("Pagina de aprovar los contactos").attr("data-approval", "true");
            $selector.append(o);

            $selector.change(function (e) {
                var sel = $(e.target).prop("selectedIndex");
                if (sel < pages.length) {
                    app.edit_page(sel, pages[sel]);
                    $(".approval-only").hide();
                    $(".pages-only").show();
                } else {
                    app.edit_page("approval", approval);
                    $(".approval-only").show();
                    $(".pages-only").hide();
                }

                $("#dropzone_wrapper").empty();
                $("<div id='dz' class='dropzone'></div>").appendTo("#dropzone_wrapper");
                $("#dropzone_wrapper > #dz").dropzone({
                    url: "upload.php?page=" + sel,
                    maxFiles: 1,
                    dictDefaultMessage: "Drop or Click to upload image",
                    dragover: function () {
                        this.removeAllFiles()
                    },
                    success: function (file) {
                        app.log(file)
                        $("#page-image").val("http://chispacard.es/hits/images/" + file.name)
                        $("#page-image").trigger('change');
                    }
                });
                $("#page-image").trigger('change');

            });

            $selector.trigger("change");

            $("#cmd-save").click(function () {
                var content = app.editor.getContent();
                app.save_content(content);
            });


            var _pass = app.storage.get("pass", "");
            if (_pass == "") {
                _pass = prompt("password 2");
            }

            Parse.User.logIn("admin", _pass).done(function () {
                app.storage.set("pass", _pass);
                app.user.getall();
            }).fail(function () {
                app.storage.set("pass", "");
                alert("Wrong Password");
            });

            app.compile();


        };

        $(document).bind("pagebeforecreate", app.pagebeforecreate);

        app.parse.setup();



    }

    return app;
})($, app, document);


function JSONToCSVConvertor(JSONData, ReportTitle, ShowLabel) {
    //If JSONData is not an object then JSON.parse will parse the JSON string in an Object
    var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;

    var CSV = '';
    //Set Report title in first row or line

    CSV += ReportTitle + '\r\n\n';

    //This condition will generate the Label/Header
    if (ShowLabel) {
        var row = "";

        //This loop will extract the label from 1st index of on array
        for (var index in arrData[0]) {

            //Now convert each value to string and comma-seprated
            row += index + ',';
        }

        row = row.slice(0, -1);

        //append Label row with line break
        CSV += row + '\r\n';
    }

    //1st loop is to extract each row
    for (var i = 0; i < arrData.length; i++) {
        var row = "";

        //2nd loop will extract each column and convert it in string comma-seprated
        for (var index in arrData[i]) {
            row += '"' + arrData[i][index] + '",';
        }

        row.slice(0, row.length - 1);

        //add a line break after each row
        CSV += row + '\r\n';
    }

    if (CSV == '') {
        alert("Invalid data");
        return;
    }

    //Generate a file name
    var fileName = "";
    //this will remove the blank-spaces from the title and replace it with an underscore
    fileName += ReportTitle.replace(/ /g, "_");

    //Initialize file format you want csv or xls
    var uri = 'data:text/csv;charset=utf-8,' + escape(CSV);

    // Now the little tricky part.
    // you can use either>> window.open(uri);
    // but this will not work in some browsers
    // or you will not get the correct file extension

    //this trick will generate a temp <a /> tag
    var link = document.createElement("a");
    link.href = uri;

    //set the visibility hidden so it will not effect on your web-layout
    link.style = "visibility:hidden";
    link.download = fileName + ".csv";

    //this part will append the anchor tag and remove it after automatic click
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function dataToExcel(data, filename, header) {
    emitXmlHeader = function () {
        return '<?xml version="1.0"?>\n' +
            '<ss:Workbook xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n' +
            '<ss:Worksheet ss:Name="Sheet1">\n' +
            '<ss:Table>\n\n';
    };

    emitXmlFooter = function () {
        return '\n</ss:Table>\n' +
            '</ss:Worksheet>\n' +
            '</ss:Workbook>\n';
    };

    jsonToSsXml = function (jsonObject, header) {
        var row;
        var col;
        var xml;
        var data = typeof jsonObject != "object" ? JSON.parse(jsonObject) : jsonObject;

        xml = emitXmlHeader();

        var col_width = 150;
        for (var i = 0; i < 5; i++) {
            xml += '<ss:Column ss:Width="' + col_width + '"/>\n'
        }

        if (header && data.length > 0) {
            xml += '<ss:Row>\n';
            for (col in data[0]) {
                xml += '  <ss:Cell>\n';
                xml += '    <ss:Data ss:Type="String">';
                xml += col + '</ss:Data>\n';
                xml += '  </ss:Cell>\n';
            }
            xml += '</ss:Row>\n';
        }

        for (row = 0; row < data.length; row++) {
            xml += '<ss:Row>\n';

            for (col in data[row]) {
                xml += '  <ss:Cell>\n';
                xml += '    <ss:Data ss:Type="String">';
                xml += data[row][col] + '</ss:Data>\n';
                xml += '  </ss:Cell>\n';
            }

            xml += '</ss:Row>\n';
        }

        xml += emitXmlFooter();
        return xml;
    };


    download = function (content, filename, contentType) {
        if (!contentType) contentType = 'application/octet-stream';
        var a = document.createElement("a");

        //set the visibility hidden so it will not effect on your web-layout
        a.style = "visibility:hidden";

        var blob = new Blob([content], {
            'type': contentType
        });
        a.href = window.URL.createObjectURL(blob);
        a.download = filename;

        //this part will append the anchor tag and remove it after automatic click
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        $.mobile.loading("hide");
    };

    download(jsonToSsXml(data, header), filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

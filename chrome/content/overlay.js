var CW_STATUS_OFFLINE = 0;
var CW_STATUS_CONNECTING = 1;
var CW_STATUS_ONLINE = 2;
var CW_STATUS_ERROR = 3;

ClipperzWidget = function()
{
    this.user = null;
    this.prompt_service = null;
    this.pref_service = null;
    this.clipboard_service = null;
    this.gui = null;
    
    this.form_data = {};
    
    // This will be defined if the currently selected page has a registered login!
    this.cur_reference = null;
    this.cur_form = null;
    
    // Indicates a remote login to the clipperz gui, see ClipperzWidget.go_home().
    this.do_login = false;
    
    // Widget status
    this.status = CW_STATUS_OFFLINE;

    return this;
};

function dumpr(obj, pref)
{
    if(pref == undefined)
        pref = "";

    for(var k in obj)
    {
        dump(pref + "key: " + k);

        if(typeof(obj[k]) == "string")
        {
            dump(", data: " + obj[k] + "\n");
        }
        else 
        {
            dump("\n");
            dumpr(obj[k], pref + "\t");
        }
    }
}
    
MochiKit.Base.update(ClipperzWidget.prototype, {
    
    'init': function()
    {        
        try
        {
            this.initialized = true;
            this.strings = document.getElementById("clipperzwidget-strings");

            document.getElementById("contentAreaContextMenu")
                    .addEventListener("popupshowing", this.handle_content_context, false);
                
            this.pref_service = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);    
                                   
            this.prompt_service = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                .getService(Components.interfaces.nsIPromptService);
                                            
            this.clipboard_service = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                .getService(Components.interfaces.nsIClipboardHelper);  
                
            // Instantiate default proxy to the clipperz server
            var url = this.pref_service.getCharPref("extensions.clipperzwidget.url");
            
            // Point URL to index.php of the clipperz backend.
            url = url + "/../index.php";
            
            // Remove double slashes!
            url = url.replace("//", "/");
            
            // TODO: Add a test e.g. in the preference panel to test this URL.
            Clipperz.PM.Proxy.defaultProxy = 
                new Clipperz.PM.Proxy.JSON({'url': url, 'shouldPayTolls':false});
            this.debug("using proxy url " + url);
                        
            // The event can be DOMContentLoaded, pageshow, pagehide, load or unload. 
            if(gBrowser)
            {  
                gBrowser.addEventListener("load", 
                    MochiKit.Base.bind(function()
                    {
                        // Only if user is offline
                        if(this.status != CW_STATUS_OFFLINE)
                            return;

                        // Login on startup?
                        if(this.pref_service.getBoolPref("extensions.clipperzwidget.autologin"))
                        {
                            this.debug("doing auto-login on startup");
                            this.login();
                        }

                    }, this), true);
               
                gBrowser.addEventListener("DOMContentLoaded", 
                    MochiKit.Base.bind(this.analyse_page, this), true);

                var container = gBrowser.tabContainer;  
                container.addEventListener("TabSelect", 
                    MochiKit.Base.bind(this.analyse_page, this), true);
            }
        }
        catch(e)
        {
            this.error(e);
        } 
    },
   
    'handle_content_context': function()
    {
        document.getElementById("context_random_password").hidden = !gContextMenu.onTextInput;
    },
    
    'paste_random_password': function()
    {
        var random_bytes;
        var random_value;
        var charset;
        var charset_bit_size;
        var string_value;
        var block_index;

        random_bytes = Clipperz.Crypto.PRNG.defaultRandomGenerator().getRandomBytes(50);
        string_value = "";
        block_index = 0;
        
        // TODO: Some user prefs for password charset would be nice to have!
        charset = "";
        charset += Clipperz.PM.Strings['passwordGeneratorLowercaseCharset'];
        charset += Clipperz.PM.Strings['passwordGeneratorUppercaseCharset'];
        charset += Clipperz.PM.Strings['passwordGeneratorNumberCharset'];
        charset += Clipperz.PM.Strings['passwordGeneratorSymbolCharset'];

        charset_bit_size = 0;
        while (Math.pow(2, charset_bit_size) < charset.length)
        {
            charset_bit_size ++;
        }
        
        if (charset_bit_size > 0)
        {
            while (Clipperz.PM.Crypto.passwordEntropy(string_value) < 128)
            {
                if (((block_index + 1) * charset_bit_size) > (random_bytes.length() * 8))
                {
                    random_bytes = Clipperz.Crypto.PRNG.defaultRandomGenerator().getRandomBytes(50);
                    block_index = 0;
                }
		
                random_value = random_bytes.bitBlockAtIndexWithSize(block_index * charset_bit_size, charset_bit_size);
                
                if (random_value < charset.length)
                {
                    string_value += charset.charAt(random_value);
                }
            
                block_index ++;
            }
        } 
        else
        {
            string_value = "";
        }
        
        
        this.clipboard_service.copyString(string_value);
        gContextMenu.target.value = string_value;
    },
    
    'analyse_page': function(res)
    {
        if(this.status != CW_STATUS_ONLINE)
            return res;
        
        //var doc = event.originalTarget; // doc is document that triggered the event  
        //var win = doc.defaultView; // win is the window for the doc  
    
        // test desired conditions and do something  
        // if (doc.nodeName == "#document") return; // only documents  
        // if (win != win.top) return; //only top window.  
        // if (win.frameElement) return; // skip iframes/frames  
        
        if(this.find_form(content.document))
        {
            this.set_form_data();
        }
        else
        {
            // Nothing found, so remove clipperz hint e.g. from currently
            // deleted logins!
            this.clear_page();
        }
        
        this.set_status(null);
        return res;
    },
    
    'clear_page': function()
    {
        try{
        var forms = content.document.getElementsByTagName("form");
        
        for(var i = 0; i < forms.length; i ++)
        {
            var form = forms[i];
            for(var j = 0; j < form.elements.length; j ++)
            {
                if(form.elements[j].type == "password" ||
                  form.elements[j].type == "text")
                {
                  form.elements[j].style.backgroundColor = 
                      form.elements[j].style.backgroundColor.replace("orange", "");
                }
            }        
        }
        }catch(e){this.error(e);}
    },
    
    'find_form': function(doc)
    {
        var forms = doc.getElementsByTagName("form");
        for(var i = 0; i < forms.length; i ++)
        {
            for(var j in this.form_data)
            {
                if(this.form_data[j]["attributes"]["action"] == forms[i].action)
                {
                    this.debug(
                        "found registered form action \"" + 
                        this.form_data[j]["attributes"]["action"] + "\", " +
                        "login reference " + j);
                    
                    this.cur_form = forms[i];
                    this.cur_reference = j;
                    
                    // Currently we do only support one login per page!
                    return true;
                }
            }
        }
        
        // No logins found.
        this.cur_form = null;
        this.cur_reference = null;
        
        return false;
    },
    
    'set_form_data': function()
    {
        if(this.cur_reference == null)
        {
            this.warning("missing login reference to set form data, ignore");
            return null;
        }
        
        var result = new MochiKit.Async.Deferred();
        var login_refs = MochiKit.Base.values(this.user.directLoginReferences());
        var reference = this.cur_reference;
        var form = this.cur_form;

        result.addCallback(MochiKit.Base.method(login_refs[reference].record(), 'deferredData'));
        result.addCallback(MochiKit.Base.method(this, function(record, reference)
        {
            var direct_login = record.directLogins()[reference];

            for(var i = 0; i < form.elements.length; i ++)
            {
               var input = new Clipperz.PM.DataModel.DirectLoginInput(direct_login, form.elements[i]);
               var result = input.formConfiguration();

               form.elements[i].value = result.value;

               if(form.elements[i].type == "password" ||
                  form.elements[i].type == "text")
                  form.elements[i].style.backgroundColor = "orange";
            }

        }), login_refs[reference].record(), login_refs[reference].reference());

        result.callback();
        return result;
    },
    
    'login': function()
    {
        // Prevent from logign in multiple times twice
        this.status = CW_STATUS_CONNECTING;
        
        var username = null;
        var password = null;
        
        var result = new MochiKit.Async.Deferred();
        var autologin = this.pref_service.getBoolPref("extensions.clipperzwidget.autologin");
        
        if(autologin == true)
        {
            username = this.pref_service.getCharPref("extensions.clipperzwidget.username");
            password = this.pref_service.getCharPref("extensions.clipperzwidget.password");
        }
        else
        {
            // Request username and password, re-call function.
            var panel = document.getElementById("cw_credentials");

            if(panel.state != "open")
            {
                MochiKit.Async.callLater(1.0, function()
                {
                    var statusbar = document.getElementById("status-bar");
                    panel.openPopup(statusbar, "before_end");
                    document.getElementById("cw_credentials_username").focus();
                });
                
                return  null;
            }
            
            username = document.getElementById("cw_credentials_username").value;
            password = document.getElementById("cw_credentials_password").value;
            panel.hidePopup();
        }
        
        this.debug("login using username \"" + username + "\"");
        this.user = new Clipperz.PM.DataModel.User({username:username, passphrase:password});
        
        result.addCallback(MochiKit.Base.method(this.user, 'connect'));
        result.addCallback(MochiKit.Base.method(this, function(res) 
        {
            this.debug("connection established");
            return res;
        }));
        
        result.addCallback(MochiKit.Base.method(this.user, 'loadPreferences'));
        result.addCallback(MochiKit.Base.method(this, function(res) 
        {
            this.debug("preferences loaded");
            return res;
        }));
        
        result.addCallback(MochiKit.Base.method(this.user, 'loadRecords'));
        result.addCallback(MochiKit.Base.method(this, function(res) 
        {
            this.debug("records loaded");
            return res;
        }));
        
        result.addCallback(MochiKit.Base.method(this.user, 'loadDirectLogins'));
        result.addCallback(MochiKit.Base.method(this, function(res) 
        {
            this.debug("direct logins loaded");
            return res;
        }));
                    
        result.addCallback(MochiKit.Base.method(this, function(res)
        {
            this.set_status(CW_STATUS_ONLINE);
            this.load_direct_logins();
            return res;
        }));
        
        result.addErrback(MochiKit.Base.method(this, function(error, res) 
        {
            this.user = null;
            this.set_status(CW_STATUS_ERROR);
            this.error(this.strings.getString("clipperzwidget.error.login_failed") + error.message);
            
            return res;
        }));
        
        result.callback();
        
        return result;
    },
    
    'logout': function()
    {
        this.user = null;
        this.form_data = {};
        this.set_status(CW_STATUS_OFFLINE);
    },
    
    'load_direct_logins': function()
    {        
        try
        {
            if(this.status != CW_STATUS_ONLINE)
                return null;
            
            // Reset form data
            this.form_data = {};
            
            var result = new MochiKit.Async.Deferred();
            var login_refs = MochiKit.Base.values(this.user.directLoginReferences());

            for(var i in login_refs)
            {             
                result.addCallback(MochiKit.Base.method(login_refs[i].record(), 'deferredData'));
                result.addCallback(MochiKit.Base.method(this, function(i, record, reference)
                {
                    var direct_login = record.directLogins()[reference];
                    
                    // See how we can fetch more data from the login record:
                    //dump("direct login: " + direct_login + "\n");
                    //dump("form data: " + direct_login.formData() + "\n");
                    //dump("action[" + i + "]: " + direct_login.formData()["attributes"]["action"]);                    
                    
                    // Register relevant data of direct login to locate the 
                    // login form when analysing the documents.
                    this.form_data[i] = direct_login.formData();

                }), i, login_refs[i].record(), login_refs[i].reference());
            }
            
            result.addCallback(MochiKit.Base.method(this, 'analyse_page'));
            result.callback();
            
            return result;
        }
        catch(e)
        {
            this.error("load_direct_logins: " + e);
            return null;
        }
    },
    
    'set_status': function(status)
    {       
        try
        {
            if(status != null)
            {
                this.debug("updating status " + status);
                this.status = status;
            }
            
            // Disable and hide all buttons
            document.getElementById("cw_copy_username").disabled = true;
            document.getElementById("cw_copy_password").disabled = true;

            document.getElementById("cw_add_login").disabled = true;
            document.getElementById("cw_update_login").disabled = true;
            document.getElementById("cw_delete_login").disabled = true;
            document.getElementById("cw_add_login").hidden = true;
            document.getElementById("cw_update_login").hidden = true;
            document.getElementById("cw_delete_login").hidden = true;  

            document.getElementById("cw_login").disabled = true;
            document.getElementById("cw_logout").disabled = true;
            document.getElementById("cw_login").hidden = true;
            document.getElementById("cw_logout").hidden = true;        

            if(this.status == CW_STATUS_ONLINE)
            {
                // Set statusbar icon
                document.getElementById("cw_statusbarpanel").src = 
                    "chrome://clipperzwidget/skin/icon_status_enabled.png";

                document.getElementById("cw_logout").hidden = false;
                document.getElementById("cw_logout").disabled = false;
                
                if(this.cur_reference != null)
                {
                    document.getElementById("cw_copy_username").disabled = false;
                    document.getElementById("cw_copy_password").disabled = false;

                    document.getElementById("cw_update_login").disabled = false;
                    document.getElementById("cw_delete_login").disabled = false;
                    document.getElementById("cw_update_login").hidden = false;
                    document.getElementById("cw_delete_login").hidden = false;  
                }
                else
                {
                    document.getElementById("cw_add_login").disabled = false;
                    document.getElementById("cw_add_login").hidden = false;      
                }                
            }
            else if(this.status == CW_STATUS_ERROR)
            {
                // Set statusbar icon
                document.getElementById("cw_statusbarpanel").src = 
                    "chrome://clipperzwidget/skin/icon_status_error.png";

                document.getElementById("cw_login").hidden = false;
                document.getElementById("cw_login").disabled = false;                
            }
            else
            {
                // Set statusbar icon
                document.getElementById("cw_statusbarpanel").src = 
                    "chrome://clipperzwidget/skin/icon_status_disabled.png";

                document.getElementById("cw_login").hidden = false;
                document.getElementById("cw_login").disabled = false;            
            }       
        }
        catch(e)
        {
            this.error("set_status: " + e);
        }
    },
    
    'debug': function(msg)
    {
        this.log("debug", msg);
    },
    
    'info': function(msg)
    {
        this.log("info", msg);
    },
    
    'error': function(msg)
    {
        this.prompt_service.alert(window,  
            this.strings.getString("clipperzwidget.error.title"),
            msg);
    },
    
    'warning': function(msg)
    {
        this.log("warning", msg);
    }, 
    
    'log': function(level, msg)
    {
        dump("clipperz_widget [" + level + "]: " + msg + "\n");
    },
    
    'open_preferences': function()
    {
        try
        {
            if (null == this._preferencesWindow || this._preferencesWindow.closed)
            {
                var instant_apply =  this.pref_service.getBoolPref("browser.preferences.instantApply");
                var features =  "chrome,titlebar,toolbar,centerscreen" + 
                                (instant_apply ? ",dialog=no" : ",modal");  

                this._preferencesWindow =  window.openDialog
                (  
                    "chrome://clipperzwidget/content/options.xul",  
                    "clipperzwidget-preferences", features
                );
            }

            this._preferencesWindow.focus(); 
        }
        catch(msg)
        {
            this.error(msg);
        }
    },
    
    'open_gui': function()
    {
        if(this.gui == null)
        {
            this.gui = gBrowser.addTab(this.pref_service.getCharPref("extensions.clipperzwidget.url")); // + "/index_debug.html");
            var tab_browser = gBrowser.getBrowserForTab(this.gui); 
            this.do_login = true;
            
            tab_browser.addEventListener("DOMContentLoaded", MochiKit.Base.bind(function()
            {
                if(this.do_login == false)
                    return;
                
                this.do_login = false;
                
                var autologin = this.pref_service.getBoolPref("extensions.clipperzwidget.autologin");
                if(autologin == false)
                    return;
                
                var input_username = content.document.createElement("input");
                input_username.type = "password";
                input_username.value =  this.pref_service.getCharPref("extensions.clipperzwidget.username");
                input_username.id = "clipperzwidget_username";
                input_username.style.visibility = "hidden";
                
                var input_password = content.document.createElement("input");
                input_password.type = "password";
                input_password.value =  this.pref_service.getCharPref("extensions.clipperzwidget.password");
                input_password.id = "clipperzwidget_password"
                input_password.style.visibility = "hidden";
                
                var script = content.document.createElement("script");
                script.type="text/javascript";
                script.innerHTML = 
                    "var main; "+
                    "Clipperz.PM.Strings.Languages.initSetup();"+
                    "main = new Clipperz.PM.Main();"+
                    "main.run();"+
                    "Clipperz.PM.defaultErrorHandler = main.defaultErrorHandler;"+
                    "MochiKit.Async.callLater(0.1, "+
                        "MochiKit.Base.bind("+
                            "main.loginPanel().doLoginWithUsernameAndPassphrase, "+
                            "main.loginPanel()),"+
                        "document.getElementById('clipperzwidget_username').value, "+
                        "document.getElementById('clipperzwidget_password').value);";
                
                content.document.getElementsByTagName("body")[0].appendChild(input_username);
                content.document.getElementsByTagName("body")[0].appendChild(input_password);
                content.document.getElementsByTagName("head")[0].appendChild(script);
                
            }, this), false);
            
            this.gui.addEventListener("TabClose", MochiKit.Base.bind(function()
            {
                this.gui = null;
                
            }, this), false);
        }
        
        gBrowser.selectedTab = this.gui;        
    },
    
    'add_login': function()
    {
        this.debug("add_login");
        
        try
        {
            /*
            var json = '{"page": {"title": "Clipperz - online password manager - debug"}, '+
                       '"form": {"attributes": {"action": "http://localhost:81/workspace/clipperz/target/php/test_login.php",'+
                       '"method": "post"},'+
                       '"inputs": [{"type": "text",'+
                       '"name": "username",'+
                       '"value": "da"},'+
                       '{"type": "password",'+
                       '"name": "password",'+
                       '"value": "da"}]},'+
                       '"version": "0.2.3"}';
                   
            var configuration = 
                Clipperz.PM.BookmarkletProcessor.checkBookmarkletConfiguration(json, null, 
                    MochiKit.Base.method(this, function() {this.error("invalid json configuration");}));
            */                    
                    
            var configuration = {};
            configuration.page = pageParameters();
            configuration.form = formParameters(findLoginForm(content.document, 0));
            configuration.version = "0.2.3";
            this.debug("got a configuration: " + configuration);            

            var record = 
                Clipperz.PM.BookmarkletProcessor.createRecordFromBookmarkletConfiguration(this.user, configuration);
            this.debug("got a record: " + record);

            var result = new MochiKit.Async.Deferred();            
            result.addCallback(MochiKit.Base.method(record, 'saveChanges'));
            result.addCallback(MochiKit.Base.method(this, "load_direct_logins"));
            
            result.addCallback(MochiKit.Base.method(this, function() 
            {
                this.info("record saved successfully");
            }));
            
            result.addErrback(MochiKit.Base.method(this, function(msg) 
            {
                this.error("could not save record: " + msg);
            }));
            
            result.callback();
            
            return result;
        }
        catch(msg)
        {
            this.error("error while adding login: " + msg);
            return null;
        }
    },
    
    'delete_login': function()
    {
        if(this.cur_reference == null)
        {
            this.warning("missing login reference to delete, ignore");
            return null;
        }
        
        try
        {               
            var result = new MochiKit.Async.Deferred();
            var login_refs = MochiKit.Base.values(this.user.directLoginReferences());
            var reference = this.cur_reference;
            
            this.debug("delete login, reference " + reference);

            result.addCallback(MochiKit.Base.method(login_refs[reference].record(), "deferredData"));
            result.addCallback(MochiKit.Base.method(login_refs[reference].record(), "remove"));
            result.addCallback(MochiKit.Base.method(login_refs[reference].record(), 'saveChanges'));
            result.addCallback(MochiKit.Base.method(this, "load_direct_logins"));
            result.addCallback(MochiKit.Base.method(this, function()
            {
                this.info("login deleted"); 
            }));            
            result.addErrback(MochiKit.Base.method(this, function(msg) 
            {
                this.error("could not delete record: " + msg);
            }));            
            result.addCallback(MochiKit.Base.method(this, 'analyse_page'));

            result.callback();
            return result;
        }
        catch(msg)
        {
            this.error("error while deleting login: " + msg);
            return null;
        }
        
        return null;
    },    
    
    'copy_username': function()
    {
        if(this.cur_reference == null)
        {
            this.warning("missing login reference to copy username from, ignore");
            return null;
        }
        
        var result = new MochiKit.Async.Deferred();
        var login_refs = MochiKit.Base.values(this.user.directLoginReferences());
        var reference = this.cur_reference;
        var form = this.cur_form;

        result.addCallback(MochiKit.Base.method(login_refs[reference].record(), 'deferredData'));
        result.addCallback(MochiKit.Base.method(this, function(record)
        {
            var fields = record.currentVersion().fields();
            
            for(var i in fields)
            {
                var field = fields[i];
                
                // TODO: We will copy the first "TXT" record as username to the 
                // clipboard. This might become problematic if more than one 
                // TXT fields are stored.
                if(field.type() == "TXT")
                {
                    this.debug("assume field \"" + field.label() + "\" as username");
                    this.clipboard_service.copyString(field.value());
                    return;
                }
            }

        }), login_refs[reference].record());

        result.callback();
        return result;
    },
    
    'copy_password': function()
    {
        if(this.cur_reference == null)
        {
            this.warning("missing login reference to copy password from, ignore");
            return null;
        }
        
        var result = new MochiKit.Async.Deferred();
        var login_refs = MochiKit.Base.values(this.user.directLoginReferences());
        var reference = this.cur_reference;
        var form = this.cur_form;

        result.addCallback(MochiKit.Base.method(login_refs[reference].record(), 'deferredData'));
        result.addCallback(MochiKit.Base.method(this, function(record)
        {
            var fields = record.currentVersion().fields();
            
            for(var i in fields)
            {
                var field = fields[i];
                
                // TODO: We will copy the first "PWD" record as password to the 
                // clipboard. This might become problematic if more than one 
                // PWD fields are stored.
                if(field.type() == "PWD") 
                {
                    this.debug("assume field \"" + field.label() + "\" as password");
                    this.clipboard_service.copyString(field.value());
                    return;
                }
            }

        }), login_refs[reference].record());

        result.callback();
        return result;
    }
});

var clipperzwidget;

window.addEventListener("load", function() 
{
    clipperzwidget = new ClipperzWidget();
    clipperzwidget.init();

}, false);

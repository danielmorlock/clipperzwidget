ClipperzWidget = function()
{
    this.user = null;
    this.prompt_service = null;
    this.pref_service = null;
    this.error = null;
    
    this.form_data = {};
    
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
        this.initialized = true;
        this.strings = document.getElementById("clipperzwidget-strings");

        document.getElementById("contentAreaContextMenu")
                .addEventListener("popupshowing", this.show_menu, false);
        
        try
        {
            this.pref_service = Components.classes["@mozilla.org/preferences-service;1"]
                                          .getService(Components.interfaces.nsIPrefBranch);    
                                   
            this.prompt_service = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                            .getService(Components.interfaces.nsIPromptService);
                
            // Instantiate default proxy to the clipperz server
            var url = this.pref_service.getCharPref("extensions.clipperzwidget.url");                           
            Clipperz.PM.Proxy.defaultProxy = 
                new Clipperz.PM.Proxy.PHP.Remote("Proxy.PM.Proxy.PHP", url + "/php/index.php");                                            
                                            
            this.login();
        }
        catch(error)
        {
            this.error = error;
        } 
        
        // The event can be DOMContentLoaded, pageshow, pagehide, load or unload. 
        if(gBrowser)
        {
            gBrowser.addEventListener("DOMContentLoaded", 
                MochiKit.Base.bind(this.analyse_page, this), false);
        }        
    },

    'onMenuItemCommand': function(e) 
    {
        //this.prompt_service.alert(window, "Clipperz User", this.user);
        
        try
        {
            //this.load_direct_logins();
            //for(var action in this.form_actions)
            dumpr(this.form_data);
            
        }
        catch(err) {alert(err);}        
    },

    'onToolbarButtonCommand': function(e) 
    {
        // just reuse the function above.  you can change this, obviously!
        this.onMenuItemCommand(e);
    },
    
    'show_menu': function(event)
    {
        // show or hide the menuitem based on what the context menu is on
        document.getElementById("context-clipperzwidget").hidden = gContextMenu.onImage;
    },
    
    'analyse_page': function(aEvent)
    {
        var doc = aEvent.originalTarget; // doc is document that triggered the event  
        //var win = doc.defaultView; // win is the window for the doc  
    
        // test desired conditions and do something  
        // if (doc.nodeName == "#document") return; // only documents  
        // if (win != win.top) return; //only top window.  
        // if (win.frameElement) return; // skip iframes/frames  
        
        // Match form actions
        var forms = doc.getElementsByTagName("form");
        for(var i = 0; i < forms.length; i ++)
        {
            for(var j in this.form_data)
            {
                if(this.form_data[j]["attributes"]["action"] == forms[i].action)
                {
                    this.info("found registered form action \"" + this.form_data[j]["attributes"]["action"] + "\"");
                    return this.set_form_data(j, forms[i]);
                }
            }
        }
    },
    
    'set_form_data': function(reference, form)
    {
        try
        {
            var result = new MochiKit.Async.Deferred();
            var login_refs = MochiKit.Base.values(this.user.directLoginReferences());

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
        }
        catch(error)
        {
            dump(error);
        }
    },
    
    'login': function()
    {
        var result = new MochiKit.Async.Deferred();
        var username = this.pref_service.getCharPref("extensions.clipperzwidget.username");
        var password = this.pref_service.getCharPref("extensions.clipperzwidget.password");

        this.user = new Clipperz.PM.DataModel.User({username:username, passphrase:password});
       
        result.addCallback(MochiKit.Base.method(this.user, 'connect'));
        result.addCallback(MochiKit.Base.method(this.user, 'loadPreferences'));
        result.addCallback(MochiKit.Base.method(this.user, 'loadRecords'));
        result.addCallback(MochiKit.Base.method(this.user, 'loadDirectLogins'));
        result.addCallback(MochiKit.Base.method(this, function() 
            { this.info("user logged in successfully"); }));
        
        // Load available direct logins and keep form actions!
        result.addCallback(MochiKit.Base.method(this, "load_direct_logins"));

        result.addErrback(function()
        {
            this.prompt_service.alert(window,  
                                      this.strings.getString("login_failed_title"),
                                      this.strings.getString("login_failed"));
        });

        result.callback("token");
        return result;
    },
    
    'load_direct_logins': function()
    {        
        try
        {
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
            
            result.addCallback(MochiKit.Base.method(this, function()
                { this.info("direct logins loaded"); }));

            result.callback();
            return result;
        }
        catch(error)
        {
            this.error(error);
        }
    },
    
    'info': function(msg)
    {
        this.log("info", msg);
    },
    
    'error': function(msg)
    {
        this.log("error", msg);
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
    }
});

var clipperzwidget;
window.addEventListener("load", function() 
{
    clipperzwidget = new ClipperzWidget();
    clipperzwidget.init();

}, false);

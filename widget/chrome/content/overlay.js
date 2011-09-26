ClipperzWidget = function()
{
    this.user = null;
    this.prompt_service = null;
    this.pref_service = null;
    this.error = null;
    this.form_actions = {};
    
    return this;
};
    
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
            for(var action in this.form_actions)
            {
                alert(action + " -> " + this.form_actions[action]);
            }
            
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
        var win = doc.defaultView; // win is the window for the doc  
    
        // test desired conditions and do something  
        // if (doc.nodeName == "#document") return; // only documents  
        // if (win != win.top) return; //only top window.  
        // if (win.frameElement) return; // skip iframes/frames  
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
                result.addCallback(MochiKit.Base.method(this, function(record, reference)
                {
                    var direct_login = record.directLogins()[reference];
                    
                    // See how we can fetch more data from the login record:
                    //dump("direct login: " + direct_login + "\n");
                    //dump("form data: " + direct_login.formData() + "\n");
                    //dump("action: " + direct_login.formData()["attributes"]["action"]);                    
                    
                    // But up to know, the reference mapped to an appropriate
                    // form action is fine!
                    this.form_actions[direct_login.formData()["attributes"]["action"]] = reference;

                }), login_refs[i].record(), login_refs[i].reference());
            }

            result.callback();
            return result;
        }
        catch(error)
        {
            dump(error);
        }
    }    
});

var clipperzwidget;
window.addEventListener("load", function() 
{
    clipperzwidget = new ClipperzWidget();
    clipperzwidget.init();

}, false);

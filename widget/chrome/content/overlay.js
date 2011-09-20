ClipperzWidget = function()
{
    this.user = null;
    this.prompt_service = null;
    this.pref_service = null;
    this.error = null;
    
    return this;
};
    
MochiKit.Base.update(ClipperzWidget.prototype, {
    
    'init': function()
    {
        this.initialized = true;
        this.strings = document.getElementById("clipperzwidget-strings");

        document.getElementById("contentAreaContextMenu")
                .addEventListener("popupshowing", this.show_menu, false);

        // The event can be DOMContentLoaded, pageshow, pagehide, load or unload. 
        if(gBrowser)
        {
            gBrowser.addEventListener("DOMContentLoaded", this.analyse_page, false);
        }
        
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
    },

    'onMenuItemCommand': function(e) 
    {
        alert(this.user);
        //this.prompt_service.alert(window, "Clipperz User", this.user);
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
        //alert("page is loaded \n" +doc.location.href);
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

        result.addErrback(function()
        {
            this.prompt_service.alert(window,  
                                      this.strings.getString("login_failed_title"),
                                      this.strings.getString("login_failed"));
        });

        result.callback("token");
        return result;
    }
});

var clipperzwidget;
window.addEventListener("load", function() 
{
    clipperzwidget = new ClipperzWidget();
    clipperzwidget.init();

}, false);

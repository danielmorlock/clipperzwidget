var clipperzwidget = 
{
    init: function(e)
    {
        this.initialized = true;
        this.strings = document.getElementById("clipperzwidget-strings");

        this.user = null;
        clipperzwidget.login();

        this.prompt_service = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                        .getService(Components.interfaces.nsIPromptService);
                                        
        document.getElementById("contentAreaContextMenu")
                .addEventListener("popupshowing", clipperzwidget.show_menu, false);

        // The event can be DOMContentLoaded, pageshow, pagehide, load or unload. 
        if(gBrowser)
        {
            gBrowser.addEventListener("DOMContentLoaded", clipperzwidget.analyse_page, false);
        }
    },

    onMenuItemCommand: function(e) 
    {    
        alert("clicked!");
        
        try
        {
            this.prompt_service.alert(window, 
                                      this.strings.getString("helloMessageTitle"),
                                      this.strings.getString("helloMessage"));
        }
        catch(err) { alert(err); }
    },

    onToolbarButtonCommand: function(e) 
    {
        // just reuse the function above.  you can change this, obviously!
        clipperzwidget.onMenuItemCommand(e);
    },
    
    show_menu: function(event)
    {
        // show or hide the menuitem based on what the context menu is on
        document.getElementById("context-clipperzwidget").hidden = gContextMenu.onImage;
    },
    
    analyse_page: function(aEvent)
    {
        var doc = aEvent.originalTarget; // doc is document that triggered the event  
        var win = doc.defaultView; // win is the window for the doc  
    
        // test desired conditions and do something  
        // if (doc.nodeName == "#document") return; // only documents  
        // if (win != win.top) return; //only top window.  
        // if (win.frameElement) return; // skip iframes/frames  
        //alert("page is loaded \n" +doc.location.href);
    },
    
    login: function()
    {
        this.user = new Clipperz.PM.DataModel.User({username:"daniel", passphrase:"ServerNull1"});
        var result = new MochiKit.Async.Deferred();

        result.addCallback(MochiKit.Base.method(this.user, 'connect'));
        result.addCallback(MochiKit.Base.method(this.user, 'loadPreferences'));
        result.addCallback(MochiKit.Base.method(this.user, 'loadRecords'));
        result.addCallback(MochiKit.Base.method(this.user, 'loadDirectLogins'));

        result.addErrback(function()
        {
            alert("could not login to clipperz server :-(");
        });

        result.addCallback(function()
        {
            alert("direct logins loaded :-)");
        });

        result.callback("token");

        return result;
    }
};

window.addEventListener("load", clipperzwidget.init, false);

clipperzwidget.show_menu = function(event)
    {
        // show or hide the menuitem based on what the context menu is on
        document.getElementById("context-clipperzwidget").hidden = gContextMenu.onImage;
    };

clipperzwidget.analyse_page = function(aEvent)
{
    var doc = aEvent.originalTarget; // doc is document that triggered the event  
    var win = doc.defaultView; // win is the window for the doc  
    
    // test desired conditions and do something  
    // if (doc.nodeName == "#document") return; // only documents  
    // if (win != win.top) return; //only top window.  
    // if (win.frameElement) return; // skip iframes/frames  
    //alert("page is loaded \n" +doc.location.href);
};

clipperzwidget.login = function()
{
    var user = new Clipperz.PM.DataModel.User({username:"daniel", passphrase:"ServerNull1"});
    var result = new MochiKit.Async.Deferred();
    
    result.addCallback(MochiKit.Base.method(user, 'connect'));
    result.addCallback(MochiKit.Base.method(user, 'loadPreferences'));
    result.addCallback(MochiKit.Base.method(user, 'loadRecords'));
    result.addCallback(MochiKit.Base.method(user, 'loadDirectLogins'));
    
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

clipperzwidget.init = function(event)
{    
    document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", clipperzwidget.show_menu, false);
    
    // The event can be DOMContentLoaded, pageshow, pagehide, load or unload. 
    if(gBrowser)
    {
        gBrowser.addEventListener("DOMContentLoaded", clipperzwidget.analyse_page, false);
    }
    
    clipperzwidget.login();
};

window.addEventListener("load", clipperzwidget.init, false);
var ClipperzWidgetPreferences = function()
{
    this.el_autologin = null;
    this.el_username = null;
    this.el_password = null;
        
    this.login = null;
    this.login_manager = null;
    this.login_info = null;
    
    // Unique hostname for this addon!
    this.login_hostname = "chrome://clipperzwidget";
    this.login_realm = "Clipperz Login";
    
    return this;
};

MochiKit.Base.update(ClipperzWidgetPreferences.prototype, {
    
    'init': function()
    {
        this.login_manager = Components.classes["@mozilla.org/login-manager;1"].  
            getService(Components.interfaces.nsILoginManager); 
        
        this.login_info = 
            new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",  
                Components.interfaces.nsILoginInfo, "init");        
                                    
        this.el_autologin = document.getElementById("pref_autologin");
        this.el_username = document.getElementById("pref_username");
        this.el_password = document.getElementById("pref_password");
        
        this.login = this.get_login();
    },
        
    'handle_autologin': function()
    {
        if(this.el_autologin.checked == true)
        {
            this.el_username.disabled = false;
            this.el_password.disabled = false;
        }
        else
        {
            this.el_username.disabled = true;
            //username.value = ""; Keep username.
            this.el_password.disabled = true;
            this.el_password.value = "";
        }
    },
    
    'show_login': function()
    {
        var username = null;
        var password = null;
        
        if(this.login != null)
        {
            username = this.login.username;
            password = this.login.password;
        }
        
        this.el_username.value = username;
        this.el_password.value = password;
    },
    
    'get_login': function()
    {
        var logins = this.login_manager.findLogins({}, 
                        this.login_hostname, null, this.login_realm);
                        
         if(logins.length == 0) 
             return null;
         
        // We only support one login!         
        return logins[0];
    },    
    
    'update_login': function()
    {
        // There is no previous login, so add a new login
        if(this.login == null)
        {
            // Do nothing if the password is not given!
            if(this.el_password.value == "")
                return;
            
            this.login = new this.login_info(this.login_hostname,  
                                             null,
                                             this.login_realm,
                                             this.el_username.value, 
                                             this.el_password.value, "", "");
                                             
            this.login_manager.addLogin(this.login);
        }
        // Modify the existing login
        else
        {
            // No username given, so remove the login!
            if(this.el_username.value == "")
            {
                this.login_manager.removeLogin(this.login);
                this.login = null;
                this.show_login();
                return;
            }
            
            // Modify login
            var login = new this.login_info(this.login_hostname,  
                                            null,
                                            this.login_realm,
                                            this.el_username.value, 
                                            this.el_password.value, "", "");
                                            
            this.login_manager.modifyLogin(this.login, login);
            this.login = login;
        }
        
        this.show_login();
        return;
    }
    
});
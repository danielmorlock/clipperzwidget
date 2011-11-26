function handle_autologin()
{
    var autologin = document.getElementById("pref_autologin");
    var username = document.getElementById("pref_username");
    var password = document.getElementById("pref_password");

    if(autologin.checked == true)
    {
        username.disabled = false;
        password.disabled = false;
    }
    else
    {
        username.disabled = true;
        //username.value = ""; Keep username.
        password.disabled = true;
        password.value = "";
    }
}

window.onload = function()
{
    handle_autologin();
}
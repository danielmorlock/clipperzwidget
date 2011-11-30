_cble = null;

//-----------------------------------------------------------------------------

isLoginForm = function(aForm) {
	var inputFields;
	var passwordFieldsFound;
	var i,c;

//console.log("is login form: " + aForm.name + " (" + aForm.id + ")");
	passwordFieldsFound = 0;
	inputFields = aForm.elements;
	c = inputFields.length;
	for (i=0; i<c; i++) {
		if (inputFields[i].type == "password") {
			passwordFieldsFound ++;
		}
    }
//console.log("number of password fields found: " + passwordFieldsFound);
	return (passwordFieldsFound == 1);
};

//-----------------------------------------------------------------------------

findLoginForm = function(aDocument, aLevel) {
	var	result;
	var	documentForms;
	var i,c;

	result = null;

	try {
		documentForms = aDocument.getElementsByTagName('form');

		c = documentForms.length;
		for (i=0; (i<c) && (result == null); i++) {
			if (isLoginForm(documentForms[i])) {
				result = documentForms[i];
			}
		}

		if ((result == null) && (aLevel == 0)) {
			var iFrames;
		
			iFrames = aDocument.getElementsByTagName('iframe');
			c = iFrames.length;
			for (i=0; (i<c) && (result == null); i++) {
				result = findLoginForm(iFrames[i].contentDocument, (aLevel + 1));
			}
		}
	} catch (e) {
		_cble = e;
	}
	
	return result;
};

//-----------------------------------------------------------------------------

inputElementValues = function(anInputElement) {
	var	result;

//	if ((anInputElement instanceof HTMLInputElement) && (anInputElement.getAttribute('name') != null)) {
	if ((anInputElement.tagName.toLowerCase() == "input") && (anInputElement.getAttribute('name') != null)) {
		result = {};
		result.type = anInputElement.getAttribute('type') || "text";
		result.name = anInputElement.getAttribute('name');
//		result.value = anInputElement.getAttribute('value');
		result.value = anInputElement.value;
		if (anInputElement.type.toLowerCase() == 'radio') {
			result.checked = anInputElement.checked;
		}
//	} else if ((anInputElement instanceof HTMLSelectElement) && (anInputElement.getAttribute('name') != null)) {
	} else if ((anInputElement.tagName.toLowerCase() == 'select') && (anInputElement.getAttribute('name') != null)) {
		var	options;
		var c,i;
		
//console.log("input element values: %o", anInputElement);
		result = {};
		result.type = "select";
		result.name = anInputElement.getAttribute('name');

		result.options = [];
		options = anInputElement.options;
		c = options.length;
		for (i=0; i<c; i++) {
			var	option;
			
			option = {};
			option.selected = options[i].selected;
			option.label = options[i].label || options[i].innerHTML;
			option.value = options[i].value;
			result.options.push(option);
		}
	} else {
		result = null;
	}

	return result;
};

//-----------------------------------------------------------------------------

formParameters = function(aLoginForm) {
	var	result;
	var	i, c;
	var	action;

	if (aLoginForm == null) {
		result = null;
	} else {
		var	radioValues;
		var	radioValueName;
		
		result = {};
		radioValues = {};
		
		action = aLoginForm.action;
		if (action.constructor != String) {
			action = aLoginForm.getAttribute('action');
		}

		if (/^https?\:\/\/.*/.test(action)) {
			action = action;
		} else if (/^\/.*/.test(action)) {
			action = window.location.protocol + '/' + '/' + window.location.hostname + action;
		} else {
			action = window.location.href.replace(/\/[^\/]*$/, '/' + action);
		}

		result.attributes = {};
		result.attributes.action = action;
		result.attributes.method = aLoginForm.getAttribute('method');

		result.inputs = [];
		c = aLoginForm.elements.length;
		for (i=0; i<c; i++) {
			var	inputElement;
			var	elementValues;
		
			inputElement = aLoginForm.elements[i];
			elementValues = inputElementValues(inputElement);
			if (elementValues != null) {
				if (elementValues.type != "radio") {
					result.inputs.push(elementValues);
				} else {
					var	radioValue;
					var	values;
					
					radioValue = radioValues[elementValues.name];
					if (radioValue == null) {
						radioValue = {};
						radioValue.name = elementValues.name;
						radioValue.type = "radio";
						radioValue.options = [];

						radioValues[elementValues.name] = radioValue;
					}
					
					values = {};
					values.value = elementValues.value;
					values.checked = elementValues.checked;
					
					radioValue.options.push(values);
				}
			}
		}
		
		for (radioValueName in radioValues) {
			if (typeof(radioValues[radioValueName]) != "function") {
				result.inputs.push(radioValues[radioValueName]);
			}
		}
	}
	
	return result;
};

//-----------------------------------------------------------------------------

pageParameters = function() {
	var result;
	
	result = {};
	result['title'] = document.title;
//<link rel="icon" href="http://example.com/favicon.ico" type="image/x-icon">

	return result;
};

//-----------------------------------------------------------------------------

reprString = function (o) { 
 	return ('"' + o.replace(/(["\\])/g, '\\$1') + '"'
			).replace(/[\f]/g, "\\f"
			).replace(/[\b]/g, "\\b"
			).replace(/[\n]/g, "\\n"
			).replace(/[\t]/g, "\\t"
			).replace(/[\r]/g, "\\r");
};

//-----------------------------------------------------------------------------

serializeJSON = function (o) {
	var objtype = typeof(o);
	if (objtype == "number" || objtype == "boolean") {
		return o + "";
	} else if (o === null) {
		return "null";
	}

//	var m = MochiKit.Base;
//	var reprString = m.reprString;
	if (objtype == "string") {
		return reprString(o);
	}

	//	recurse
	var me = arguments.callee;
	//	array
	if (objtype != "function" && typeof(o.length) == "number") {
		var res = [];
		for (var i = 0; i < o.length; i++) {
			var val = me(o[i]);
			if (typeof(val) != "string") {
				val = "undefined";
			}
			res.push(val);
		}
		return "[" + res.join(",\n") + "]";
	}

	//	undefined is outside of the spec
	if (objtype == "undefined") {
//		throw new TypeError("undefined can not be serialized as JSON");
		throw new TypeError("error");
	}

	//	generic object code path
	res = [];
	for (var k in o) {
		if (typeof(o[k]) != "function") {
			var useKey;
			if (typeof(k) == "number") {
				useKey = '"' + k + '"';
			} else if (typeof(k) == "string") {
				useKey = reprString(k);
			} else {
				//	skip non-string or number keys
				continue;
			}

			val = me(o[k]);
			if (typeof(val) != "string") {
				//	skip non-serializable values
				continue;
			}
			res.push(useKey + ":" + " " + val);
		}
	}

	return "{" + res.join(",\n") + "}";
};

//-----------------------------------------------------------------------------

closeBookmarklet = function() {
	var	bookmarkletDiv;

	bookmarkletDiv = document.getElementById("clipperz_bookmarklet");
	bookmarkletDiv.parentNode.removeChild(bookmarkletDiv);
};

//-----------------------------------------------------------------------------

logFormParameters = function(someParameters, anException) {
	var	newDiv;
	var base_url;
	var	help_url;
	var	base_image_url;
	var	logo_image_url;
	var	background_image_url;
	var	close_image_url;
	var	bookmarklet_textarea;
	var innerHTML;
	
	base_url = "http://www.clipperz.com/";
	help_url = base_url + "help/bookmarklet";
	base_image_url = base_url + "files/clipperz.com/bookmarklet/";
	logo_image_url = base_image_url + "logo.png";
	background_image_url = base_image_url + "background.png";
	close_image_url = base_image_url + "close.png";
	
//	newDiv.parentNode.removeChild(newDiv);
	newDiv = document.createElement('div');
	newDiv.setAttribute("id", "clipperz_bookmarklet");
//	newDiv.setAttribute("style", "width:270px; height:400px; padding:20px 0px 0px 20px; margin:0px; border:0px; background-color:transparent; background-repeat:no-repeat; position:absolute; z-index:20000; top:40px; left:40px; background-image:url(" + background_image_url + ");");

	innerHTML = "";
	innerHTML +=	"<style>div#ClipperzBackgroundDIV { width:290px; height:420px; padding:20px 0px 0px 20px; margin:0px; border:0px; background-color:transparent; background-repeat:no-repeat; position:absolute; z-index:20000; top:40px; left:40px; background-image:url(" + background_image_url + ") }</style>";
	innerHTML +=	"<div style=\"border:0px; margin:0px; padding:0px; padding-left:10px;\">" +
						"<img  style=\"padding-top:5px;\" src=\"" + logo_image_url + "\">" +
						"<a href=\"javascript:closeBookmarklet();\">" + 
							"<img style=\"padding-left:28px; padding-bottom:10px;\" border=0 src=\"" + close_image_url + "\">" +
						"</a>" +
					"</div>";

	if ((someParameters != null) && (anException == null)) {
		innerHTML +=	"<div style=\"width:255px; border-top:1px dotted #336;\">" +
							"<div style=\"line-height:10pt; margin-right:10px; margin-top:5px; padding:5px 10px; color:#666; text-align:left; font-family:sans-serif;\">" +
								"<p style=\"margin:0px; font-weight:bold; font-size:10pt; font-family:sans-serif;\">How to add a new card or a direct login to an existing card for this website:</p>" +
								"<ol style=\"padding:0px 0px 0px 20px; font-size:9pt; font-family:sans-serif;\">" +
									"<li>Copy the content of the text area below (Ctrl-C)</li>" +
									"<li>Go to your Clipperz account</li>" +
									"<li>Click \"Add new card\" or select the related card</li>" +
									"<li>Paste the direct login configuration (Ctrl-V)</li>" +
									"<li>Complete and review the details, then click \"Save\"</li>" +
								"</ol>" +
							"</div>" +
						"</div>";
		innerHTML +=	"<textarea id=\"bookmarklet_textarea\" style=\"border:2px solid #333366; font-family:sans-serif; font-size:8pt; color:#336; width:240px; height:135px; padding:4px; background-color:white; margin:0px 10px;\">" +
							serializeJSON(someParameters) +
						"</textarea>";
	} else if ((someParameters == null) && (anException == null)) {
		innerHTML += "<div>No login form has been found on the page</div><div>Get some help <a href=\"#\">here</a></div>";
	} else {
		innerHTML += "<div>An error happened while processing the page</div><div>Get some help <a href=\"#\">here</a></div><div>" + anException.name + " - " + anException.message + "</div>";
	}
	
	newDiv.innerHTML = "<div id=\"ClipperzBackgroundDIV\">" + innerHTML + "</div>";
	
	document.body.appendChild(newDiv);
	
	if ((someParameters != null) && (anException == null)) {
		bookmarklet_textarea = document.getElementById("bookmarklet_textarea");
		bookmarklet_textarea.focus();
		bookmarklet_textarea.select();
	}
};

//-----------------------------------------------------------------------------

getLoginFormConfiguration = function(element) {
	var	parameters;

	try {
		parameters = {};
		parameters.page = pageParameters();
		parameters.form = formParameters(findLoginForm(element, 0));
		parameters.version = "0.2.3";
		logFormParameters(parameters, _cble);
	} catch (e) {
	//	parameters = "No login form has been found"
		logFormParameters(parameters, e);
	}
}

//-----------------------------------------------------------------------------




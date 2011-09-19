/*

Copyright 2008 Clipperz Srl

This file is part of Clipperz Community Edition.
Clipperz Community Edition is a web-based password manager and a
digital vault for confidential data.
For further information about its features and functionalities please
refer to http://www.clipperz.com

* Clipperz Community Edition is free software: you can redistribute
  it and/or modify it under the terms of the GNU Affero General Public
  License as published by the Free Software Foundation, either version
  3 of the License, or (at your option) any later version.

* Clipperz Community Edition is distributed in the hope that it will
  be useful, but WITHOUT ANY WARRANTY; without even the implied
  warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
  See the GNU Affero General Public License for more details.

* You should have received a copy of the GNU Affero General Public
  License along with Clipperz Community Edition.  If not, see
  <http://www.gnu.org/licenses/>.


*/



if (typeof(Clipperz) == 'undefined') { Clipperz = {}; }
if (typeof(Clipperz.PM) == 'undefined') { Clipperz.PM = {}; }
if (typeof(Clipperz.PM.Components) == 'undefined') { Clipperz.PM.Components = {}; }
if (typeof(Clipperz.PM.Components.RecordDetail) == 'undefined') { Clipperz.PM.Components.RecordDetail = {}; }

//#############################################################################

Clipperz.PM.Components.RecordDetail.AbstractFieldSubComponent = function(anElement, args) {
	args = args || {};

    Clipperz.PM.Components.RecordDetail.AbstractFieldSubComponent.superclass.constructor.call(this, anElement, args);

	this._fieldComponent = args.fieldComponent || null;
	
	this.render();
	
	return this;
}

//=============================================================================

YAHOO.extendX(Clipperz.PM.Components.RecordDetail.AbstractFieldSubComponent, Clipperz.PM.Components.RecordDetail.AbstractComponent, {

	'toString': function() {
		return "Clipperz.PM.Components.RecordDetail.AbstractFieldSubComponent";
	},

	//-------------------------------------------------------------------------

	'fieldComponent': function() {
		return this._fieldComponent;
	},

	//-------------------------------------------------------------------------

	'mainComponent': function() {
		return this.fieldComponent().mainComponent();
	},
	
	//-------------------------------------------------------------------------

	'recordField': function() {
		return this.fieldComponent().recordField();
	},

	//-------------------------------------------------------------------------
	__syntaxFix__: "syntax fix"
});


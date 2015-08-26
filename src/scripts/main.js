// Electron UI Variable initialization
var remote = require('remote');
var Menu = remote.require('menu');
// Nodejs and Application Variable initialization
var path = require('path');
var appSrcFolderPath = (__dirname.indexOf('asar') === -1) ? path.resolve('src') : path.resolve(__dirname, '../../src/');
var Uploader = require('../scripts/uploader');
var serviceName;
var publicName;
// Registering Jquery Electron Way
// TODO fetch from bower components
window.$ = window.jQuery = require('../scripts/jquery.js');
// TODO use jquery hide and show methods instead of adding classes
// Disable Menu bar
Menu.setApplicationMenu(null);

/**
 * Display error below the input field
 */
var showError = function(id, msg) {
  var pos = $('#' + id).offset();
  var errorElement = $('.error');
  errorElement.css('top', pos.top + 40 + 'px');
  errorElement.css('left', pos.left + 'px');
  errorElement.css('display', 'block');
  $('.error-msg').html(msg);
  setTimeout(function() {
    $('.error').css('display', 'none');
  }, 3000);
};

/**
 * Validates service name and public name
 * @returns {boolean}
 */
var validate = function() {
  var serviceNameElement = document.getElementById('service_name');
  var publicNameElement = document.getElementById('public_name');
  if (serviceNameElement.checkValidity() && publicNameElement.checkValidity() && publicNameElement.value.indexOf('.') === -1) {
    return true;
  } else if(!serviceNameElement.checkValidity()) {
    showError('service_name', 'Service Name cannot be empty');
  } else if(!publicNameElement.checkValidity()) {
    showError('public_name', 'Public Name cannot be empty');
  } else if (publicNameElement.value.indexOf('.') > -1) {
    showError('public_name', 'Public Name cannot contain "."');
  }
  return false;
};

/**
 * Clears the Publicname and service Name fields
 */
var clearServiceAndPublicName = function() {
  $('#service_name').val('');
  $('#public_name').val('');
};

/**
 * Invoked on clicking the Upload files button.
 * Validates the input and moves to the next section
 */
var validateInput = function() {
  if(!validate()) {
    return;
  }
  serviceName = $('#service_name').val();
  publicName = $('#public_name').val();
  showSection('step-2');
  clearServiceAndPublicName();
};

/**
 * Shows the section corresponding to the id.
 * @param id
 */
var showSection = function(id) {
  var tmp;
  var hideClass = 'hide';
  var sections = [];
  $('section').map(function(i, e) {
    sections.push(e.getAttribute('id'));
  });
  for (var i in sections) {
    if (sections[i] === id) {
      $('#' + sections[i]).removeClass(hideClass);
      continue;
    }
    tmp = $('#' + sections[i]);
    if (!tmp.hasClass(hideClass)) {
      tmp.addClass(hideClass);
    }
  }
};


/**
 *  Dragover and drop is disabled on document.
 *  Read > https://github.com/nwjs/nw.js/issues/219
 */
document.addEventListener('dragover', function(e){
  e.preventDefault();
  e.stopPropagation();
}, false);

document.addEventListener('drop', function(e){
  e.preventDefault();
  e.stopPropagation();
}, false);

/** Uploader Callback - when the upload starts **/
var onUploadStarted = function() {
  showSection('step-3');
};
/** Uploader Callback - Updating progress bar **/
var updateProgressBar = function(meter) {
  $('.indicator div.meter').css('width', meter + '%');
};
/** Uploader Callback - when the upload is completed **/
var onUploadComplete = function(errorCode) {
  showSection(errorCode ? 'failure': 'success');
  if (!errorCode) {
    $('#success_msg').html('Files Uploaded! Access the files from firefox, <b><i>safe:' +
        serviceName + '.' + publicName + '</i></b>');
    return;
  }
  var reason;
  switch (errorCode) {
    case -1001:
      reason = 'Service Name and Public Name Already Registered';
      break;

    default:
      reason = "Oops! Something went wrong";
  }
  $('#error_msg').html(reason);
};

/**
 * Invoked to register the Drag and Drop Region
 * @param id - to enable drag and drop of files
 */
var registerDragRegion = function(id) {
  var helper;
  var holder;
  holder = document.getElementById(id);
  holder.ondragover = function () { this.className = 'hover'; return false; };
  holder.ondragleave = function () { this.className = ''; return false; };
  holder.ondrop = function (e) {
    e.preventDefault();
    if (e.dataTransfer.files.length === 0) {
      return false;
    }
    helper = new Uploader(onUploadStarted, updateProgressBar, onUploadComplete);
    helper.uploadFolder(serviceName, publicName, e.dataTransfer.files[0].path);
    return false;
  };
};

/**
 * The template is generated from the `/views/template` by replacing the the edited title and description.
 * The dependencies for the page such as normalize.css and bg.jpg are copied along with the genarted template to a temp Directory.
 * The temp directory is finally passed for Uploading to the network
 */
var publishTemplate = function() {
  var temp = require('temp').track();
  var fs = require('fs');
  var util = require('util');

  var tempDirName = 'safe_uploader_template';
  var title = $('#template_title_input').val();
  var content = $('#template_content_input').val();
  var templateDependencies = {
    'bg.jpg': 'imgs/phone_purple.jpg',
    'normalize.css': 'bower_components/bower-foundation5/css/normalize.css'
    //'foundation.css': 'bower_components/bower-foundation5/css/foundation.css'
  };

  try {
    var tempDirPath = temp.mkdirSync(tempDirName);

    // Save the template in the temp Directory
    var templateString = fs.readFileSync(path.resolve(appSrcFolderPath, 'views/template.html')).toString();
    fs.writeFileSync(path.resolve(tempDirPath, 'index.html'),
        util.format(templateString.replace(/SAFE_SERVICE/g, serviceName).replace(/SAFE_PUBLIC/g, publicName), title, content));
    // Save the template dependencies
    var buff;
    for (var key in templateDependencies) {
      buff = fs.readFileSync(path.resolve(appSrcFolderPath, templateDependencies[key]));
      fs.writeFileSync(path.resolve(tempDirPath, key), buff);
    }
    //// Values edited in the template are reset to defaults
    resetTemplate();
    //// Start upload
    var helper = new Uploader(onUploadStarted, updateProgressBar, onUploadComplete);
    helper.uploadFolder(serviceName, publicName, tempDirPath);
  } catch(e) {
    console.log(e.message);
    showSection('failure');
  }
};

/**** Template Updation functions *****/
$('#template_title_input').focusout(function() {
  $('#edit_template_title').addClass('hide');
  $('#template_title').removeClass('hide');
});

var editTemplateTitle = function() {
  $('#template_title').addClass('hide');
  $('#edit_template_title').removeClass('hide');
  $('#template_title_input').focus();
};

var updateTemplateTitle = function(value) {
  $('#template_title').html(value);
};

$('#template_content_input').focusout(function() {
  $('#edit_template_content').addClass('hide');
  $('#template_content').removeClass('hide');
});

var editTemplateContent = function() {
  $('#template_content').addClass('hide');
  $('#edit_template_content').removeClass('hide');
  $('#template_content_input').focus();
};

var updateTemplateContent = function(value) {
  $('#template_content').html(value);
};

var resetTemplate = function() {
  $('#template_title').html("My Page");
  $('#template_title_input').val("My Page");
  $('#template_content').html("This page is created and published on the SAFE Network using the SAFE Uploader");
  $('#template_content_input').val("This page is created and published on the SAFE Network using the SAFE Uploader");
};

/*****  Initialisation ***********/
registerDragRegion('drag_drop');
$('#service_name').focus();
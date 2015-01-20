var fs = require('fs'),
  path = require('path');
$ = window.jQuery || require('atom').$;
var Thief = require('./colorthief');
var GUI = require('./datgui').GUI;
var less = require('./less');

var LessColor = less.tree.Color;
var LessFunctions = less.functions.functionRegistry._data;

var STYLES_PATH = path.join(__dirname, "..", "..", "dynamicstyles", "atom-ui-personalize.less");
var AUTOSHEET_PATH = path.join(__dirname, "..", "..", "dynamicstyles", "autosheet.less");

var BG_REPOS = [{
  "list": "https://raw.githubusercontent.com/g00nsquad/atom-bgswitcher/master/list.txt",
  "prepend": "https://raw.githubusercontent.com/g00nsquad/atom-bgswitcher/master/images/"
}, {
  "list": "https://raw.githubusercontent.com/gstack/bars-backgrounds/master/bgs.txt",
  "prepend": "https://raw.githubusercontent.com/gstack/bars-backgrounds/master/"
}];

// current repo
var repo = BG_REPOS[0];

var GUI_OPTS = {
  props: {
    type: 'folder',
    text: "Background",
    items: {
      src: {
        type: 'string'
      },
      bgName: { type: 'string' }
    }
  },
  panelOpts: {
    type: 'folder',
    text: 'Panels',
    items: {
      panelStyle: { type: 'boolean' },
      panelColor: { type: 'color' },
      panelOpacity: { type: 'float' }
    }
  },
  filters: {
    type: 'folder',
    text: "Filters (BG)",
    items: {
      blur: {
        type: 'boolean'
      },
      blurRadius: { type: 'int' },
      sepia: { type: 'boolean' },
      sepiaAmount: { type: 'float' },
      useBrightness: { type: 'boolean' },
      brightness: { type: 'float2' },
      useContrast: { type: 'boolean' },
      contrast: { type: 'float2' },
      hueRotate: { type: 'boolean' },
      hueDeg: { type: 'deg' }
    }
  },
  editorBg: { type: 'boolean' },
  menuBg: { type: 'boolean' },
  tintPanels: { type: 'boolean' },
  editorBgColor: { type: 'color' },
  editorBgAlpha: { type: 'float2' },
};

var BackgroundTheme = function(src)
{
  this.bgName = '';
  this.panelStyle = false;
  this.panelColor = [0, 0, 0];
  this.panelOpacity = 1.0;

  this.menuBg = true;

  this.blurRadius = 1;
  this.blur = false;
  this.sepia = false;
  this.sepiaAmount = 0.2;
  this.tintPanels = true;

  this.editorBg = true;
  this.editorBgColor = [0, 0, 0];
  this.editorBgAlpha = 0.2;

  this.useBrightness = false;
  this.useContrast = false;

  this.hueRotate = false;
  this.hueDeg = 180;

  this.brightness = 1.0;
  this.contrast = 1.0;

  this.src = src;
  this.applying = false;

  this.change = window.bg.change;

//  this.ui_comment_use = [100, 100, 100];
//  this.ui_primary_use = [100, 100, 100];


  this.baseColor = '#000';
  this.addColors = [];

  var keys = Object.keys(window.bg.used_colors);
  for (var i=0;i<keys.length;i++)
  {
    var color = window.bg.used_colors[keys[i]];
    if (keys[i].indexOf("_use") != -1) continue;

    this[keys[i]] = color;
    this.addColors.push(keys[i]);
  }
}

BackgroundTheme.prototype.apply = function() {
  if (this.applying)
  {
    setTimeout(this.apply.bind(this), 1000);
    return;
  }

  this.applying = true;
  fs.writeFile(AUTOSHEET_PATH, this.toCSS(), function(err) {
    if (err) console.log(err);
    if (bg.src != this.src)
    {
      window.bg.src = this.src;
      window.bg.seen.push(bg.src);

      $("body").bgswitcher('setImages', bg.seen);
      $("body").bgswitcher('select', bg.seen.length - 1);
    }
    setTimeout(function(){
    reloadSheet();
    /*  try { atom.themes.loadUserStylesheet(); } catch (ex) {} */
    }, 100);

    console.log('applied theme.');
    this.applying = false;
  }.bind(this));
}

BackgroundTheme.prototype.saveTheme = function()
{
  var bgName = this.src.split('/');
  if (!this.bgName || this.bgName.trim().length == 0)
    this.bgName = bgName[bgName.length-1].split('.')[0];

  bgName = bgName[bgName.length-1];
  fs.writeFile(path.join(path.dirname(AUTOSHEET_PATH), "..", "saved", this.bgName+".json"), JSON.stringify(this), function(err) {
    if (err)
    {
      console.dir(err);
      return;
    }
    
    atom.notifications.addSuccess('saved UI/Wallpaper theme: '+bgName);
  });
}

BackgroundTheme.prototype.toCSS = function()
{
  var less_js = "";
  var keys = Object.keys(this);
  for (var i=0;i<keys.length;i++)
  {
    var c = this[keys[i]];
    if (keys[i].indexOf("_") == -1)
      continue;

    if (typeof(c) != 'string') {
      for (var x=0;i<x.length;i++)
        x[i] = parseInt(x[i]);
    }

    c = new LessColor(c);
    //console.dir(c);
    less_js += "@" + keys[i] + ": "+c.toRGB()+";\r\n";
    less_js += "@" + keys[i] + "_use: "+c.toRGB()+";\r\n";
  }


  var filter = "";

  if (this.blur)
    filter += "blur("+parseInt(this.blurRadius)+"px)";

  if (this.sepia)
    filter += " sepia("+parseFloat(this.sepiaAmount)+")";

  if (this.useBrightness)
    filter += " brightness("+parseFloat(this.brightness)+")";

  if (this.useContrast)
    filter += " contrast("+parseFloat(this.contrast)+")";

  if (this.hueRotate)
    filter += " hue-rotate("+parseInt(this.hueDeg)+"deg)";

  filter = filter.trim();
  less_js += ".bgswitcher { -webkit-filter: "+filter+"!important; } \r\n";

  // tool panels + tree view
  if (this.panelStyle)
  {
    // bit redundant
    var c = new bg.LessColor(this.panelColor);
    c.alpha = this.panelOpacity.toFixed(2);
    var txt = c.toCSS();

    var sfAdd = "";
    if (this.menuBg)
    {
      sfAdd = ", .sf-menu";
    }

    var line = "";
    if (txt.indexOf("NaN") == -1)
    {
      line += "body > atom-panel, .panel, .terminal, atom-panel.modal, atom-panel-container .tool-panel"+sfAdd+" { background: "+txt+"!important; }";
    }
    else
    {
      this.panelColor = [0,0,0];
    }

    line += "\r\n";
    less_js += line;
  }

  // editor / panes
  if (this.editorBg)
  {
    // bit redundant
    var c = new bg.LessColor(this.editorBgColor);
    c.alpha = this.editorBgAlpha.toFixed(2);
    var txt = c.toCSS();

    var line = "";
    if (txt.indexOf("NaN") == -1)
    {
      var sfAdd = "";
      if (this.menuBg)
      {
        sfAdd = ", .sf-menu";
      }
      line += "atom-pane, .editor, .terminal .tool-panel"+sfAdd+" { background: "+txt+"!important; }";
      if (this.tintPanels)
      {
        //  line = "atom-workspace, atom-panel, atom-panel.modal, .editor, .gutter, atom-panel-container, atom-workspace-axis, atom-pane, " + line;
        line = "atom-workspace, atom-panel, .terminal, atom-panel.modal, .editor, .gutter, atom-panel-container, atom-pane"+sfAdd+ " { background: "+txt+"!important; }";
      }
    }
    else
    {
      this.editorBgColor = [0,0,0];
    }

    line += "\r\n";
    less_js += line;
  }

  // body > atom-panel, .panel, atom-panel.modal, atom-panel-container .tool-panel

  return less_js;
}

var onChange = function(c) {
  if (window.bg.saveTimeout != -1)
    window.clearTimeout(window.bg.saveTimeout);

  window.bg.saveTimeout = window.setTimeout(function(){
   window.setImmediate(function() { window.bg.theme.apply(); });
 }, 100);
};

function addKeys(gui, opts)
{


  var keys = Object.keys(opts);
  for (var i=0;i<keys.length;i++)
  {
    var o = opts[keys[i]];

    switch (o.type) {
      case 'int':
        var c = gui.add(bg.theme, keys[i]).onChange(onChange);
        c.onChange(onChange);
        c.min(0);
        c.step(1);
        c.listen();
        break;
      case 'deg':
        var c = gui.add(bg.theme, keys[i]).onChange(onChange);
        c.onChange(onChange);
        c.min(0);
        c.max(360);
        c.step(1);
        c.listen();
        break;
       case 'float':
          var c = gui.add(bg.theme, keys[i]).onChange(onChange);
        //  c.onChange(onChange);
          c.step(0.1);
          c.min(0);
          c.max(1);
          c.listen();
          break;
      case 'float2':
        var c = gui.add(bg.theme, keys[i]).onChange(onChange);
      //c.onChange(onChange);
        c.step(0.01);
        c.min(0);
        c.max(1);
        c.listen();
        break;
      case 'boolean':
      case 'bool':
      	var c = gui.add(bg.theme, keys[i]);
        c.onChange(onChange);
        c.listen();
      	break;
      case 'string':
      case 'str':
      	var str = gui.add(bg.theme, keys[i]);
        str.onChange(onChange);
        str.listen();
      	break;
      case 'color':
        var color = gui.addColor(bg.theme, keys[i]);
        color.onChange(onChange);
        color.listen();
        break;
      case 'folder':
        var fl = gui.addFolder(o.text);
        addKeys(fl, o.items)
	      break;
      default:
	       var x = gui.add(bg.theme, keys[i]);
      }
  }
}

function createGUI() {
  if (window.bg.gui)
    window.bg.gui.destroy();

  var gui = new GUI({ autoPlace: true });
  window.bg.gui = gui;
  window.bg.reloadSheet = reloadSheet;
  window.bg.theme = new BackgroundTheme(bg.src);

  window.bg.saveTimeout = -1;

  addKeys(gui, GUI_OPTS);

  bg.theme.addColors = bg.theme.addColors.sort();

  for (var i=0;i<bg.theme.addColors.length;i++)
  {
    var key = bg.theme.addColors[i];
    var color = gui.addColor(bg.theme, key);
    color.onChange(onChange);
  }

  for (var i=0;i<gui.__controllers.length;i++)
  {
    var cont = gui.__controllers[i];
    cont.onChange(onChange);
  }

  var keys = Object.keys(gui.__folders);
  for (var i=0;i<keys.length;i++) {
    var f = gui.__folders[keys[i]];
    for (var fi=0;fi<f.__controllers.length;fi++)
    {
      var cont = f.__controllers[fi];
      cont.onChange(onChange);
    }
  }

  gui.add(bg.theme, 'change');
  gui.add(bg.theme, 'saveTheme');
  
  // gui.remember(bg.theme);
  
  if (!window.ui_personalize.state.on)
    $('.dg').addClass('hidden');
}

function bgCt(colors)
{
  var out = {};
  var ks = Object.keys(colors);
  for (var i=0;i<ks.length;i++)
  {
    var c = colors[ks[i]];

    out[ks[i]+"_use"] = new LessColor(c);

    out[ks[i]] =  bg.functions.lighten(out[ks[i]+"_use"], 15);
    out[ks[i]] =  bg.functions.saturate(out[ks[i]+"_use"], 10);

    out[ks[i]] = out[ks[i]+"_use"];
  }

  out['ui_color'] = bg.functions.lighten(out['ui_color'], { value: 40 });
  out['ui_color'] = bg.functions.saturate(out['ui_color'], { value: 50 });


  out['ui_primary'] = bg.functions.saturate(out['ui_color'], { value: 50 });
  out['ui_primary'] = bg.functions.lighten(out['ui_color'], { value: 15 });

  out['ui_color_use'] = bg.functions.lighten(out['ui_color'], { value: 10 });
  out['ui_property_use'] = bg.functions.lighten(out['ui_property_use'], { value: 10 });

  out['ui_comment_use'] = bg.functions.saturate(out['ui_comment_use'], { value: 80 });
  out['ui_comment_use'] = bg.functions.lighten(out['ui_comment_use'], { value: 15 }); // or 20%
  out['ui_comment'] = out['ui_comment_use'];

  out['ui_keyword_use'] = bg.functions.lighten(out['ui_keyword_use'], { value: 15 });

  out['ui_property_use'] = bg.functions.saturate(out['ui_spacer_use'], { value: 70 });
  out['ui_property_use'] = bg.functions.lighten(out['ui_spacer_use'], { value: 20 });

  out['ui_spacer_use'] = bg.functions.saturate(out['ui_property_use'], { value: 25 });
  out['ui_spacer_use'] = bg.functions.lighten(out['ui_property_use'], { value: 15 });

  out['ui_property_two'] = bg.functions.saturate(out['ui_property_use'], { value: 20 });
  out['ui_property_two'] = bg.functions.lighten(out['ui_property_two'], { value: 25 });

  out['ui_variable'] = bg.functions.lighten(out['ui_variable'], { value: 30 });
  out['ui_variable'] = bg.functions.saturate(out['ui_variable'], { value: 30 });

/*
  out['ui_comment_use'] = bg.functions.saturate(out['ui_primary_use'], { value: 25 });
  out['ui_comment_use'] = bg.functions.lighten(out['ui_comment_use'], { value:15 }); */
 out['ui_comment'] = out['ui_comment_use'];
 out['ui_property'] = out['ui_property_use'];
 out['ui_keyword'] = out['ui_keyword_use'];
 out['ui_variable_use'] = out['ui_variable'];
 out['ui_spacer'] = out['ui_spacer_use'];
 //out['ui_property_two'] = out['ui_property_two'];

  /*
  @ui_color_use: darken(@ui_color, 20%);
  @ui_property_use: lighten(@ui_property, 10%);
  @ui_comment_use: lighten(saturate(@ui_comment, 80), 15);
  @ui_variable_use: saturate(lighten(@ui_variable, 25%), 100);
  @ui_comment_use: lighten(@ui_comment, 20%);
  @ui_keyword_use: lighten(@ui_keyword, 50%);
  @ui_spacer_use: darken(@ui_spacer, 20%);
  @ui_property_use: saturate(lighten(@ui_property, 15%), 25);
  @ui_spacer_use: saturate(@ui_property_use, 90%);
  @ui_property_two: lighten(saturate(@ui_primary, 40%), 10%);
  */
  console.dir(out);
  return out;
}

function reloadSheet()
{

  var el = document.createElement('style');
  el.id = 'ui_personalize_styles';

  // add userstylesheet path here.
  bg.less.render(bg.theme.toCSS() + "\n" + fs.readFileSync(STYLES_PATH, 'utf-8').toString(), { paths: [__dirname,path.dirname(AUTOSHEET_PATH) ] }).then(function(output) {
    // fs.writeFile()
     el.innerHTML = output.css;
     if (bg.current_style_el)
       $(bg.current_style_el).remove();
     bg.current_style_el = el;
     bg.current_style = $('head').append(el);
     console.log('created style element: '+el.id);
  }, function(err) { console.log('bg.js / less error: '+err); });

  //bg.current_style = atom.styles.addStyleElement({ priority: 10, sourcePath: STYLES_PATH });
}

$(function() {
  $.get(repo.list,
    function(data) {
      var imgs = data.split("\n").map(function(x) {
        return repo.prepend + x;
      });
      imgs = imgs.filter(function(x) { return x.toLowerCase().indexOf("wall") != -1; }); // only hd walls

      console.log('loaded background image library');
      console.dir(imgs);

      window.bg = window.bg || {
        random: true,
        Thief: Thief
      };
      
      // todo: integrate users own library sets
      
      window.bg_images = imgs;
      window.bg_timeout = -1;
      window.bg.index = 0;
      window.bg.seen = [imgs[0]];
      window.bg.ready = false;
      window.bg.less = less;
      window.bg.LessColor = LessColor;
      window.bg.functions = LessFunctions;

      $("body").bgswitcher({
        images: [imgs[Math.floor(Math.random() * bg_images.length)]],
        loop: false,
        shuffle: false,
        duration: 2000,
        interval: Infinity
      });

      var change = function() {
        if (window.bg_timeout != -1)
          window.clearTimeout(window.bg_timeout);

        if (window.bg.random) {
          var rand = bg_images[Math.floor(Math.random() * bg_images.length)];
          window.bg.src = rand;
        } else if (true) {
          window.bg.index++;
          if (window.bg.index < bg_images.length) {

            window.bg = window.bg || {};
            window.bg.color = color;
            window.bg.index = bg.index;
            window.bg.src = bg_images[bg.index];
          } else {
            window.bg.index = 0;
            window.bg.change();
            return;
          }
        }

        var img = new Image();
        img.onload = function() {
          var thief = new bg.Thief.ColorThief();
          var color = bg.Thief.ParseRGB(thief.getColor(img)),
              pallette = thief.getPalette(img);

          window.bg.color = new LessColor([color.r, color.g, color.b]);

          var syntaxColors = [];
          var temphsv;

          // hue rotates
          for (var i = 0; i < pallette.length; i++) {
            pallette[i] = bg.Thief.ParseRGB(pallette[i]);
            temphsv = bg.Thief.RGB2HSV(pallette[i]);
            temphsv.hue = bg.Thief.HueShift(temphsv.hue, 180.0);
            syntaxColors.push(bg.Thief.HSV2RGB(temphsv));
          }

          window.bg.syntaxColors = syntaxColors.slice();
          console.log('image loaded, got colors: ');
          console.dir(JSON.stringify(window.bg.syntaxColors));

          window.bg.ready = false;

      var less_js = (function () {/*
                    @ui_keyword: black;
                    @ui_color: black;
                    @ui_comment: black;
                    @ui_property: black;
                    @ui_color: black;
                    @ui_comment: black;
                    @ui_spacer: black;
                    @ui_variable: black;
                    @ui_primary: primarycol;
                    @ui_property: black;
                    @ui_property_two: black;
                    */}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1];

          var used_colors = {};

          less_js = less_js.split("\n").map(function(line) {
            color = window.bg.syntaxColors.pop() || color;
            if (line.split('@')[1] == null) return '';
            var name = line.split('@')[1].split(':')[0];
            used_colors[name] = [color.r, color.g, color.b];

            return line.trim().replace(': black;', ': rgb(' +
              color.r + ',' +
              color.g + ',' + color.b + ');');
          }).join("\n");
          less_js = less_js.replace("primarycol;", 'rgb(' + color.r +
            ',' +
            color.g + ',' + color.b + ');');
          less_js += "\r\n";


          var use_colors = bgCt(used_colors);
          var keys = Object.keys(use_colors);
          for (var i=0;i<keys.length;i++)
          {
            var c = use_colors[keys[i]];
            less_js += "@" + keys[i] + ": "+c.toRGB()+";\r\n";
            used_colors[keys[i]] = c.rgb;
            used_colors[keys[i]+"_use"] = c.rgb;
          }

          window.bg.original_less = less_js;
          window.bg.used_colors = used_colors;

          fs.writeFile(AUTOSHEET_PATH, less_js, function(err) {
            if (err) throw err;
            window.bg.seen.push(bg.src);

            if (window.ui_personalize.state.autoChange) {
              window.bg_timeout = window.setTimeout(window.bg.change, (
              180 *
              1000) + ((Math.floor(Math.random() * 200)) * 50));
            }

            $("body").bgswitcher('setImages', bg.seen);
            $("body").bgswitcher('select', bg.seen.length - 1);

           // also creating bg.theme
            createGUI(window.bg);
            bg.theme.apply();
          });

        }
        img.onerror = function() {

          console.error('error loading: ' + window.bg.src);
          window.bg_timeout = window.setTimeout(change, 200);
        };

        img.src = window.bg.src;
      };

      window.bg.change = change;
      change(); // first call
    });
});

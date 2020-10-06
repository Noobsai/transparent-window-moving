const Clutter = imports.gi.Clutter;
const Meta = imports.gi.Meta;
const GLib = imports.gi.GLib;

const ExtensionUtils = imports.misc.extensionUtils;

let _settings = null;
let _window_opacity;

let _on_window_grab_begin, _on_window_grab_end;
let _on_move_changed, _on_resize_changed;

let _allowed_grab_operations = [];
let _grab_moving_operations = [
  Meta.GrabOp.MOVING,
  Meta.GrabOp.KEYBOARD_MOVING
];

let _grab_resizing_operations = [
  Meta.GrabOp.RESIZING_NW,
  Meta.GrabOp.RESIZING_N,
  Meta.GrabOp.RESIZING_NE,
  Meta.GrabOp.RESIZING_E,
  Meta.GrabOp.RESIZING_SW,
  Meta.GrabOp.RESIZING_S,
  Meta.GrabOp.RESIZING_SE,
  Meta.GrabOp.RESIZING_W,
  Meta.GrabOp.KEYBOARD_RESIZING_UNKNOWN,
  Meta.GrabOp.KEYBOARD_RESIZING_NW,
  Meta.GrabOp.KEYBOARD_RESIZING_N,
  Meta.GrabOp.KEYBOARD_RESIZING_NE,
  Meta.GrabOp.KEYBOARD_RESIZING_E,
  Meta.GrabOp.KEYBOARD_RESIZING_SW,
  Meta.GrabOp.KEYBOARD_RESIZING_S,
  Meta.GrabOp.KEYBOARD_RESIZING_SE,
  Meta.GrabOp.KEYBOARD_RESIZING_W
];

function init_grab_operations() {
  _allowed_grab_operations = [];
  if (_settings.get_boolean('transparent-on-moving')) {
    _allowed_grab_operations.push(..._grab_moving_operations);
  }

  if (_settings.get_boolean('transparent-on-resizing')) {
    _allowed_grab_operations.push(..._grab_resizing_operations);
  }
}

function is_grab_operation_allowed(grab_op) {
  return _allowed_grab_operations.indexOf(grab_op) > -1; 
}

function set_opacity(window_surface, target_opacity, on_complete) {
  let complete_func = function() { 
    if (on_complete) { 
      on_complete(); 
    }
  };

  let transition_time = _settings.get_double('transition-time');
  if (transition_time < 0.001) { 
    window_surface.opacity = target_opacity;
    complete_func();
  } else {
    window_surface.ease({
      duration: transition_time * 1000,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD, 
      opacity: target_opacity,
      onComplete: complete_func
    });
  }
}

function get_window_surface(meta_window) {
  let window_actor = meta_window.get_compositor_private();
  let childs = window_actor.get_children();
  for (let i = 0; i < childs.length; i++) {
    if (childs[i].constructor.name.indexOf('MetaSurfaceActor') > -1) {
      return childs[i];
    }
  }

  return window_actor;
}

function window_grab_begin(meta_display, meta_screen, meta_window, meta_grab_op, gpointer) {
  if (!meta_window || !is_grab_operation_allowed(meta_grab_op)) {
    return;
  }

  let window_surface = get_window_surface(meta_window);
  let pid = meta_window.get_pid();
  if (!_window_opacity[pid]) {
    _window_opacity[pid] = window_surface.opacity; 
  }

  let opacity_value = _settings.get_int('window-opacity');
  set_opacity(window_surface, opacity_value);
}

function window_grab_end(meta_display, meta_screen, meta_window, meta_grab_op, gpointer) {
  if (!meta_window || !is_grab_operation_allowed(meta_grab_op)) {
    return;
  }

  let window_surface = get_window_surface(meta_window);
  let pid = meta_window.get_pid();

  set_opacity(window_surface, _window_opacity[pid], function() { delete _window_opacity[pid]; });
}

function enable() {
  _settings = ExtensionUtils.getSettings();
  init_grab_operations();
  _window_opacity = {};
  _on_window_grab_begin = global.display.connect('grab-op-begin', window_grab_begin);
  _on_window_grab_end = global.display.connect('grab-op-end', window_grab_end);
  _on_move_changed = _settings.connect('changed::transparent-on-moving', init_grab_operations);
  _on_resize_changed = _settings.connect('changed::transparent-on-resizing', init_grab_operations);
}

function disable() {
  global.display.disconnect(_on_window_grab_begin);
  global.display.disconnect(_on_window_grab_end);
  _settings.disconnect(_on_move_changed);
  _settings.disconnect(_on_resize_changed);

  _window_opacity = {};
  _settings.run_dispose();
}

function init() {
  ExtensionUtils.initTranslations();
}
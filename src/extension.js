const Tweener = imports.ui.tweener;
const Meta = imports.gi.Meta;
const GLib = imports.gi.GLib;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

let settings = null;
let WindowState;

let on_window_garb_begin, on_window_garb_end;

let allowed_grab_operations = [
  //Meta.GrabOp.NONE,
  //Meta.GrabOp.WINDOW_BASE,
  //Meta.GrabOp.COMPOSITOR,
  //Meta.GrabOp.WAYLAND_POPUP,
  //Meta.GrabOp.FRAME_BUTTON,
  Meta.GrabOp.MOVING,
  Meta.GrabOp.RESIZING_NW,
  Meta.GrabOp.RESIZING_N,
  Meta.GrabOp.RESIZING_NE,
  Meta.GrabOp.RESIZING_E,
  Meta.GrabOp.RESIZING_SW,
  Meta.GrabOp.RESIZING_S,
  Meta.GrabOp.RESIZING_SE,
  Meta.GrabOp.RESIZING_W,
  Meta.GrabOp.KEYBOARD_MOVING,
  Meta.GrabOp.KEYBOARD_RESIZING_UNKNOWN,
  Meta.GrabOp.KEYBOARD_RESIZING_NW,
  Meta.GrabOp.KEYBOARD_RESIZING_N,
  Meta.GrabOp.KEYBOARD_RESIZING_NE,
  Meta.GrabOp.KEYBOARD_RESIZING_E,
  Meta.GrabOp.KEYBOARD_RESIZING_SW,
  Meta.GrabOp.KEYBOARD_RESIZING_S,
  Meta.GrabOp.KEYBOARD_RESIZING_SE,
  Meta.GrabOp.KEYBOARD_RESIZING_W,
];

function is_grab_operation_allowed(grab_op) {
  return allowed_grab_operations.indexOf(grab_op) > -1; 
}

function set_opacity(window_actor, target_opacity, on_complete, set_timeout) {
  let transition_time = settings.get_double('transition-time');

  let state = WindowState[window_actor.meta_window.get_pid()];
  let thread = Date.now();
  state.thread = thread;

  let on_completed = function () { 
    state.thread = 0;
    if (on_complete) { 
      on_complete(); 
    }
  };

  if (transition_time < 0.001) { 
    window_actor.opacity = target_opacity;
    on_completed();
  } else {
    Tweener.addTween(window_actor, {
        time: transition_time,
        transition: 'easeOutQuad',
        opacity: target_opacity,
        onComplete: on_completed
    });
    if (set_timeout) {
      setTimeout(function() { 
        if (state && state.thread == thread){
          window_actor.opacity = target_opacity;
          on_completed();
        }
      }, transition_time * 1000 + 100);
    }
  }
}

function setTimeout(handler, time){
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, time, function() {
    handler();
    return false;
  });
}

function window_garb_begin(meta_display, meta_screen, meta_window, meta_grab_op, gpointer) {
  if (!meta_window) {
    return;
  }

  if (!is_grab_operation_allowed(meta_grab_op)) {
    return;
  }

  let window_actor = meta_window.get_compositor_private();

  let state = WindowState[meta_window.get_pid()];
  if (!state) {
    state = { thread: -1, original_opacity: window_actor.opacity }
    WindowState[meta_window.get_pid()] = state;
  }

  let opacity_value = settings.get_int('window-opacity');
  set_opacity(window_actor, opacity_value);
}

function window_garb_end(meta_display, meta_screen, meta_window, meta_grab_op, gpointer) {
  if (!meta_window) {
    return;
  }

  if (!is_grab_operation_allowed(meta_grab_op)) {
    return;
  }

  let state = WindowState[meta_window.get_pid()];
  let window_actor = meta_window.get_compositor_private();
  set_opacity(window_actor, state.original_opacity, function () { delete WindowState[meta_window.get_pid()]; }, true);
}

function enable() {
  settings = Convenience.getSettings();
  WindowState = {};
  on_window_garb_begin = global.display.connect('grab-op-begin', window_garb_begin);
  on_window_garb_end = global.display.connect('grab-op-end', window_garb_end);
}

function disable() {
  if (on_window_garb_begin) {
     global.display.disconnect(on_window_garb_begin);
  }

  if (on_window_garb_end) {
     global.display.disconnect(on_window_garb_end);
  }

  WindowState = {};
  settings.run_dispose();
}

function init() {
  Convenience.initTranslations();
}
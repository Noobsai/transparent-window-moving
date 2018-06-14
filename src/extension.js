const Tweener = imports.ui.tweener;
const Meta = imports.gi.Meta;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

let settings = null;
let current_window_opacity = null;

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

function set_opacity(window_actor, target_opacity, on_completed) {
  let transition_time = settings.get_double('transition-time');
  if (transition_time == 0) {
    window_actor.opacity = target_opacity;
    (on_completed || function() {})();
  } else {
    Tweener.addTween(window_actor, {
        time: transition_time,
        transition: 'easeOutQuad',
        opacity: target_opacity,
        onComplete: on_completed || function() {}
    });
  }
}

function window_garb_begin(meta_display, meta_screen, meta_window, meta_grab_op, gpointer) {
  if (!meta_window) {
    return;
  }

  if (!is_grab_operation_allowed(meta_grab_op)) {
    return;
  }

  let window_actor = meta_window.get_compositor_private();
  if (!current_window_opacity) {
    current_window_opacity = window_actor.opacity;
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

  let window_actor = meta_window.get_compositor_private();
  if (current_window_opacity) {
    set_opacity(window_actor, current_window_opacity, function () { current_window_opacity = null; });
  }
}

function enable() {
  settings = Convenience.getSettings();
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

  settings.run_dispose();
}

function init() {
  Convenience.initTranslations();
}
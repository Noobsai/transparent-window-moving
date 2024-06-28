#=============================================================================
UUID=transparent-window-moving@noobsai.github.com
SRCDIR=src
BUILDDIR=build/$(UUID)
GNOME_EXTENSIONS_DIR=/home/$(USER)/.local/share/gnome-shell/extensions
#=============================================================================
EXTENSION_DIR = $(GNOME_EXTENSIONS_DIR)/$(UUID)
SCHEMA_DIR = src/schemas
SCHEMA_COMPILED = $(dir $(SCHEMA))/gschemas.compiled
#=============================================================================
clean:
	rm -rf $(BUILDDIR)
	rm -f $(SCHEMA_COMPILED)

build: $(BUILDDIR) $(SCHEMA_COMPILED) $(LOCALE_FILES)
	cp -r $(SRCDIR)/* $(BUILDDIR)

zip: build
	cd $(BUILDDIR) && zip -r $(UUID).zip * && mv $(UUID).zip ../

install: build $(EXTENSION_DIR)
	cp -r $(BUILDDIR)/* $(EXTENSION_DIR)

uninstall:
	rm -rf $(EXTENSION_DIR)

debug_install: build
	ln -s $(realpath $(BUILDDIR)) $(GNOME_EXTENSIONS_DIR)



$(BUILDDIR):
	mkdir -p $@

$(EXTENSION_DIR):
	mkdir -p $@

$(SCHEMA_COMPILED): $(SCHEMA_DIR)
	glib-compile-schemas $<

reload:
	gnome-extensions disable $(UUID) || exit 0
	gnome-extensions enable $(UUID)

#= Localization teargets =====

GETTEXT_DOMAIN = $(UUID)

POT_FILE = po/$(GETTEXT_DOMAIN).pot
LOCALE_DIR = $(BUILDDIR)/locale
PO_FILES = $(wildcard ./po/*.po)
LOCALE_FILES = $(patsubst ./po/%.po, $(LOCALE_DIR)/%/LC_MESSAGES/$(UUID).mo,$(PO_FILES))

$(LOCALE_DIR)/%/LC_MESSAGES/$(GETTEXT_DOMAIN).mo: po/%.po $(LOCALE_DIR)/%/LC_MESSAGES
	msgfmt $< -o $@

$(LOCALE_DIR)/%/LC_MESSAGES: $(BUILDDIR)
	mkdir -p $@

pot-file: $(POT_FILE)

$(POT_FILE):
	xgettext --from-code=UTF-8 --output=$@ src/*.js

merge-po-files: $(POT_FILE)
	for po in "$(PO_FILES)"; do \
		msgmerge -U "$$po" $(POT_FILE); \
	done;

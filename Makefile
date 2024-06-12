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

build: $(BUILDDIR) $(SCHEMA_COMPILED)
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
	gnome-extensions disable $(UUID)
	gnome-extensions enable $(UUID)

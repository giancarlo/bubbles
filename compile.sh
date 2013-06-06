cd ../j5g3 && grunt minify
cd ../bubbles

cat ../j5g3/build/j5g3-all.min.js ../mice.js/mice.js bubbles.js > build.js

java -jar ../closure-compiler/compiler.jar --warning_level VERBOSE --compilation_level ADVANCED_OPTIMIZATIONS --language_in=ECMASCRIPT5_STRICT --js build.js --js_output_file bubbles.compiled.js

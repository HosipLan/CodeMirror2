CodeMirror.defineMode("texy", function(config, modeConfig) {

  var htmlMode = CodeMirror.getMode(config, { name: 'xml', htmlMode: true });

  var keysOf = function(obj) {
     var keys = [];
     for(var key in obj) {
        keys.push(key);
     }
     return keys;
  };

  var copyKeys = function (keys, from, to) {
    for (var i = 0, keys; i < keys.length; i++) {
      var key = keys[i]; if (i in keys) to[key] = from[key];
    }
    return to;
  }



  var Tokenizers = {};

  var Context = function(tokenizer, parent) {
    this.next = tokenizer;
    this.parent = parent;
  };

  var State = function(htmlState) {
    this.context = new Context(Tokenizers.default, null);
    this.htmlState = htmlState;
    this.headingLevel = 0;
    this.bold = false;
    this.italic = false;
  };

  var Token = function(name, context) {
    this.name = name;
    this.context = context;
  };


  var text = new RegExp('^[^\[#=*-_\\\/<>`]+');

  var headerLevels = {'#':1, '*':2, '=':3, '-':4};
  var header = new RegExp('^(?:\\' + keysOf(headerLevels).join('{2,}|\\') + '{2,})');


  Tokenizers.default = function(stream, context, state, nextLine, prevLine) {
    var token = new Token(null, context);
    var aChar = stream.next();

    //console.log(['isText', text.test(aChar), stream.string.slice(0), stream.match(text, false)]);

    if (aChar === '<' && stream.match(/^\w/, false)) {
      token = Tokenizers.html(new Context(Tokenizers.html, context), context, state);

    } else if (stream.match(header, false)) { // prefixed or underline
      if (stream.match(header, true) && stream.eol()) { // underline
        if (prevLine && prevLine.match(text)) {
          state.headingLevel = headerLevels[aChar];
        }

      } else if (stream.match(text, true)) { // prefixed
        state.headingLevel = headerLevels[aChar];
      }

    } else {
      if (stream.eatWhile(text)) {
        aChar = nextLine.peek();
        if (nextLine && nextLine.match(header, true) && nextLine.eol()) { // next underlined
          state.headingLevel = headerLevels[aChar];
        }

      } else {
        console.log(['wtf', stream.string, stream.pos]);
        stream.next();
      }
    }

    if (state.headingLevel > 0) {
      token.name = 'header';
    }

    return token;
  };

  Tokenizers.code = function (stream, context, state) {
    var token = new Token('code', context);

    return token;
  };

  Tokenizers.html = function (stream, context, state) {
    var style = htmlMode.token(stream, state.htmlState);
    var token = new Token(style, context);

    if (style === 'tag' && state.htmlState.type !== 'openTag' && !state.htmlState.context) {
      token.context = new Context(Tokenizers.default, context);
    }

    return token;
  };



  return {
    startState: function() {
      return new State(htmlMode.startState());
    },

    copyState: function(state) {
      var newState = new State(CodeMirror.copyState(htmlMode, state.htmlState));
      return copyKeys(['context', 'headingLevel', 'bold', 'italic'], state, newState);
    },

    token: function(stream, state, lines) {
      if (stream.eatSpace()) {
        return null;
      }

      var token = state.context.next(
        stream,
        state.context,
        state,
        lines.shift(),
        stream.previous.shift()
      );

      state.context = token.context;
      state.lastToken = token;

      return token.name;
    },

    blankLine: function blankLine(state) {
      state.headingLevel = 0;
      state.bold = false;
      state.italic = false;
    },

    lookahead: 1
  };

});

CodeMirror.defineMIME("text/x-texy", "texy");

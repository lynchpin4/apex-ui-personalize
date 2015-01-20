{CompositeDisposable} = require 'atom'

required_bgswitcher = false

module.exports = ApexUiPersonalize =
  modalPanel: null
  subscriptions: null

  activate: (state) ->
    @state = state
    if not @state
      # customizer mode - settings
      @state.on = false
      @state.autoChange = false

    # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable

    # Register command that toggles this view
    @subscriptions.add atom.commands.add 'atom-workspace', 'atom-ui-personalize:toggle': => @toggle()
    @subscriptions.add atom.commands.add 'atom-workspace', 'atom-ui-personalize:next-background': => window.bg?.change()

    window.ui_personalize = @
    if not required_bgswitcher
      require './bgswitcher'


  deactivate: ->
    @subscriptions.dispose()

  serialize: ->
    { on: @state.on }

  toggle: ->
    @state.on = !@state.on

    if @state.on
      $('.dg').removeClass 'hidden'
      if bg.gui then bg.gui.open()
    else
      $('.dg').addClass 'hidden'
      if bg.gui then bg.gui.close()

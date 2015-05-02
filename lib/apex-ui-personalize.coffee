{CompositeDisposable} = require 'atom'

required_bgswitcher = false

module.exports = ApexUiPersonalize =
  modalPanel: null
  subscriptions: null
  
  config:
    bg_folder:
      type: 'string'
      default: "https://raw.githubusercontent.com/gstack/bars-backgrounds/master/"
    list_url:
      type: 'string'
      default: 'https://raw.githubusercontent.com/gstack/bars-backgrounds/master/bgs.txt'

  activate: (state) ->
    @state = state
    if not @state
      # customizer mode - settings
      @state.on = no
      @state.autoChange = false

    # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    @subscriptions = new CompositeDisposable

    # Register command that toggles this view
    @subscriptions.add atom.commands.add 'atom-workspace', 'ui-personalize:toggle': => @toggle()
    @subscriptions.add atom.commands.add 'atom-workspace', 'ui-personalize:next-background': => window.bg?.change()

    window.ui_personalize = @
    if not required_bgswitcher
      require('./bgswitcher')((bg)=> 
        @state.on = no
        @toggle()
      )
    
    setTimeout((=>
      
      console.log 'initial open'), 2000)


  deactivate: ->
    @subscriptions.dispose()

  serialize: ->
    { on: @state.on }

  toggle: ->
    @state.on = !@state.on
    if @state.on
      $('.dg').removeClass 'hidden'
      if window.bg?.gui then bg?.gui?.open()
    else
      $('.dg').addClass 'hidden'
      if window.bg?.gui then bg?.gui?.close()

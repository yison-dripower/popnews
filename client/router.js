var newsList = [];
var dependency = new Tracker.Dependency();

Router.route('/', function(){
  $.get('/news-data', function(data){
    newsList = $.parseJSON(data);
    dependency.changed();
  });
  $(document).on('click', '#news-list li', function(){
    if($(this).hasClass('focus')) {
      $(this).removeClass('focus');
    } else {
      $('#news-list li').removeClass('focus');
      if($(this).find('.digest').length > 0) {
        $(this).addClass('focus');
      }
    }
  });
  $(document).on('click', '#news-list li a', function(event){
    event.stopPropagation();
  });
  setInterval(function(){
    window.location.reload();
  },60000);
  this.render('Home');
});

Router.route('/subscribe/list', function(){
  this.render('Subscribe');
});

Router.route('/subscribe/add', function(){
  this.render('AddSubscribe')
});

Template.home.helpers({
  newsList: function () {
    dependency.depend();
    return newsList;
  },
  wechat: function() {
    return this.source.id == 1;
  },
  notWechat: function() {
    return this.source.id != 1;
  }
});

Router.route('/news-data', { where: 'server' })
  .get(function(){
    var mysql      = Meteor.npmRequire('mysql');
    var connection = mysql.createConnection({
      host     : '127.0.0.1',
      user     : 'root',
      password : '',
      database : 'popnews'
    });
    var wrapper =  Meteor.npmRequire('node-mysql-wrapper');
    var db = wrapper.wrap(connection);
    var _this = this;
    db.ready(function(){
      var Sources = db.table('source');
      var News = db.table('news');
      Sources.findAll().then(function(sources){
        var criteria = News.criteria.orderBy('id', true).build();
        News.find(criteria).then(function(news){
          for(var i=0; i<news.length; i++) {
            news[i]['source'] = getSourceById(news[i]['source'], sources);
            news[i]['wechat'] = news[i]['source']['id'] == 2;
            news[i]['notWechat'] = news[i]['source']['id'] != 2;
          }
          _this.response.end(JSON.stringify(news));
        });
      });
    });
  });

  var getSourceById = function(id, sources) {
    for(var i in sources) {
      if(sources[i]['id'] == id) {
        return sources[i];
      }
    }
    return null;
  }

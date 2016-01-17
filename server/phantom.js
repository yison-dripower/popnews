var phantom = Meteor.npmRequire("phantom");
var mysql      = Meteor.npmRequire('mysql');
var schedule = Meteor.npmRequire('node-schedule');
var dateFormat = Meteor.npmRequire('dateformat');
var sleep = Meteor.npmRequire('sleep');
var connection = mysql.createConnection({
  host     : '127.0.0.1',
  user     : 'root',
  password : '',
  database : 'popnews'
});

var wrapper =  Meteor.npmRequire('node-mysql-wrapper');
var db = wrapper.wrap(connection);

db.ready(function(){
  var Sources = db.table("source");
  var Rule = db.table("rule");
  Sources.findAll().then(function(sources){
    Rule.findAll().then(function(rules){
      scheduleBehav(sources, rules, start);
    });
  });
});

var start = 0;
var scheduleBehav = function(sources, rules) {
  var sc = sources[start];
  var rule = getRuleById(sc['rule'], rules);
  schedule.scheduleJob('*/' + sc.frequency + ' * * * *', function(){
    doPhantom(rule, sc);
    start = start + 1;
    if(start < sources.length) {
      scheduleBehav(sources, rules, start);
    }
  });
}

var getRuleById = function(id, rules) {
  for(var i=0; i<rules.length; i++){
    if(id == rules[i]['id']) {
      return rules[i];
    }
  }
  return null;
}

var doPhantom = function(rule, source) {
  phantom.create(function (ph) {
    ph.createPage(function (page) {
      /*ph.clearCookies();
      ph.addCookie({
        'domain'   : 'sogou.com',
        'name'     : 'ppinf',
        'value'    : '5|1453000481|1454210081|Y2xpZW50aWQ6NDoyMDE3fGNydDoxMDoxNDUzMDAwNDgxfHJlZm5pY2s6Mjc6JUU5JTk4JUJGJUU1JUIwJUJDJUU3JThFJTlCfHRydXN0OjE6MXx1c2VyaWQ6NDQ6RDQwRjQ1QTMxMTEyODUwMUI0MEYyOEU5QURGODZBQjZAcXEuc29odS5jb218dW5pcW5hbWU6Mjc6JUU5JTk4JUJGJUU1JUIwJUJDJUU3JThFJTlCfA'
      });
      ph.addCookie({
        'domain'   : 'sogou.com',
        'name'     : 'pprdig',
        'value'    : 'vaocGV7uF-KIHwWC_BBsejGA5WZFiy5NIm4D7nwcclmibpSNAmldQRixxN-uk9sSYsqewyzE5dNv882on9MtXSbE9CfJkpmTdTmEjwLEiberQxIgyJydQM8_wEyUrWb8PBTQUe98gdXOHTrqWENw79rpIHQ2hxkdTU3BPSMcrtk'
      });*/
      page.open(source.url, function (status) {
        console.log("opened "+source.url, status);
        sleep.sleep(3);
        page.evaluate(function (rule) {
          var newsList = document.querySelectorAll(rule.news);
          var list = [];
          for(i=0; i < newsList.length; i++) {
            var item = newsList[i];
            if(typeof item == 'object') {
              var title = item.querySelector(rule.title);
              var digest = item.querySelector(rule.digest);
              var link = item.querySelector(rule.link);
              var news = {};
              if(title != undefined && title != null) {
                news['title'] = title.innerText ;
              }
              if(digest != undefined && digest != null) {
                news['digest'] = digest.innerText ;
              }
              if(link != undefined && link != null) {
                news['link'] = link.href ;
              }
            }
            list.push(news);
          }
          return list ;
        }, function (result) {
          afterPhantom(result, source);
          ph.exit();
        }, rule);
      });
    });
  });
}

var afterPhantom = function(res, source) {
  var resList = [];
  var c = 0;
  for(var i=0; i <res.length; i++) {
    if(res[i]['title'] != undefined && c < 10) {
      resList.push(res[i]);
      c++;
    }
  }
  res = resList;
  var News = db.table('news');
  var criteria =  News.criteria
                      .where('source').eq(source.id)
                      .orderBy("id",true)
                      .limit(100)
                      .build();

  News.find(criteria).then(function(newsList){
      var titles = [];
      for(var i=0;i<newsList.length;i++) {
        if(newsList[i]['title'] != undefined) {
          titles.push(newsList[i]['title']);
        }
      }
      for(var i=res.length-1;i>=res.length-10;i--) {
        var rs = res[i];
        if(rs.title == undefined) {
          continue ;
        }
        if(! _.contains(titles, rs.title) && rs.title != undefined) {
          var item = {
            title: rs.title,
            source: source.id
          };
          if(rs.link != undefined && rs.link != null) {
            item.link = rs.link;
          }
          if(rs.digest != undefined && rs.digest != null) {
            item.digest = rs.digest;
          }
          var now = new Date();
          item.gmt_create = dateFormat(now, "isoDateTime");
          item.gmt_modified = dateFormat(now, "isoDateTime");
          try {
            News.save(item).then(function(result){
              console.log('new News :::: ' + result.title);
            });
          } catch(e) {
            console.log('Err: cannot save news item' + e);
          }
        }
      }
  });
}

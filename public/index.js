// index page
$(document).on('pageinit', '#index' ,function(){
  console.log("pageinit index");
});
$(document).on('pagebeforeshow', '#index' ,function(){
  console.log("pagebeforeshow index");
});
$(document).on('pageshow', '#index' ,function(){
  console.log("pageshow index");
});

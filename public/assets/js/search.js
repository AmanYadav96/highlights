$(document).ready(function() {
    $("#textSearch").keypress(function(e) {
      if(e.which == 13) {
        var query = $("#textSearch").val();
        console.log(query);
        window.location = "/admin/users?query="+query;
      }
    });

  });
var userContext = null;
var foodContext = null;
var DataStore = null;
var last_perUser = {};
var states = {
    "login": ["intro", "login"],
    "ptor": ["identity", "ptor"],
    "locked": ["identity", "locked", "foodSelection"],
    "select": ["identity", "foodSelection"],
    "confirm": ["identity", "confirm"],
    "confirmed": ["identity", "wait"],
    "fail": ["identity", "fail"],
    "success": ["identity", "success"]
};

function setState(state) {
    $(".inview").removeClass("inview").addClass("notinview")
    _.each(states[state], function (s) {
        $("#" + s).addClass("inview").removeClass("notinview");
    });
    $('html, body').animate({
        scrollTop: 0
    }, 1);
}

function isUserLocked(index) {
    return (_.indexOf(data_locked_users, index) !== -1);
}
function setStateByLoggedinUser(index) {
    if (_.indexOf(data_dont_bring, index) !== -1)
        return setState("ptor");
    if (isUserLocked(index)) {
        setLockedUser();
        return setState("locked");
    }
    return setState("select");
}
function userSelectedFn(index) {
    return function (event) {
        event.preventDefault();
        userContext = index;
        updateBringing();
        setStateByLoggedinUser(index);
        $(".loggedInFamily").text(data_names[index]);
    }
}

function logout(event) {
    event.preventDefault();
    setState("login");
}

function foodSelectedFn(index) {
    return function (event) {
        event.preventDefault();
        if (!isUserLocked(userContext) && !$(this).hasClass("disabled")) {
            foodContext = index;
            $(".wantToBring").text(data_food[index]);
            setState("confirm");
        }
    }
}

function confirmed(event) {
    var t = (new Date()).getTime();
    setState("confirmed");
    DataStore.push({
        item: foodContext,
        user: userContext,
        time: t
    });
    event.preventDefault();
}

function cancelled(event) {
    event.preventDefault();
    setState("select");
}


function addList(list, parentId, clickGenerator) {
    var ul = $("<ul>").addClass("nav nav-pills nav-stacked");
    var liClass = (parentId == 'foodlist') ? "class='disabled'" : ""
    _.each(list, function (name, index) {
        $("<li " + liClass + "><a href='#'>" + name + "<span class='family-selected'></span></a></li>").click(clickGenerator(index)).appendTo(ul);
    });
    ul.appendTo("#" + parentId);
}

function success() {
    setState("success");
    foodContext = null;
}

function fail() {
    setState("fail");
    foodContext = null;
}

function locked() {
    setState("locked");
    foodContext = null;
}
function setLockedUser() {
    $("#foodlist li").addClass("locked");
}
function updateTransactionList(snapshot) {
    var trans = snapshot.val();
    var perUser = {};
    var perItem = {};
    console.log(trans)
    _.each(trans, function (op) {
        var item = op.item;
        var user = op.user;
        if (typeof (perItem[item]) === "undefined" || perItem[item] === null) {
            //item is not already taken, or taken and then switched
            perItem[item] = user;
            if (typeof (perUser[user]) === "undefined" || perUser[user] === null) {
                //user has no previous selections
                perUser[user] = item;
            } else {
                //user has previous selections: switch
                var oldItem = perUser[user];
                perUser[user] = item;
                perItem[oldItem] = null;
            }
        }
    });

    $("#foodlist li").removeClass("disabled").find("span").text("");
    _.each(perItem, function (user, item) {
        var foodIndex = item;
        if (user !== null) {
            var familyName = data_names[user];
            $("#foodlist li:eq(" + foodIndex + ")").addClass("disabled").find("span").text(familyName);
        }
    });

    superDuper(data_locked_users, data_dont_bring, perUser);

    ////check success
    if (foodContext !== null && typeof (perItem[foodContext]) !== "undefined") {
        if (perItem[foodContext] === userContext)
            success();
        else
            fail();
    }

    //update brininginging
    last_perUser = perUser;
    updateBringing();
}

function superDuper(data_locked_users, data_dont_bring, perUser) {
    var h = location.href || '';
    if (h.toLowerCase().indexOf('superduper') !== -1) {
        _.each(data_dont_bring, function (user) {
            $("#families li:eq(" + user + ")").find("span").text(" פטור ");
        });

        _.each(perUser, function (item, user) {
            if (user !== null) {
                var foodName = data_food[item];
                $("#families li:eq(" + user + ")").find("span").text(" " + foodName + " ");
            }
        });
        _.each(data_locked_users, function (user) {
            var o = $("#families li:eq(" + user + ")").find("span");
            o.text(o.text() + " -- נעול --");
        });
    }
}

function updateBringing() {
    var bringing = !(userContext === null || typeof (last_perUser[userContext]) === "undefined" || last_perUser[userContext] === null)
    if (bringing) {
        $("#youAreBringing").show();
        $("#bringing").text(data_food[last_perUser[userContext]]);
    } else
        $("#youAreBringing").hide();

}

function main() {
    $(".theTitle").text(event_title)
    console.log("Event: " + event_title + " (" + event_key + ")")
    console.log("Families: " + data_names.length)
    console.log("Items: " + data_food.length)
    console.log("****************")
    DataStore = new Firebase('https://shining-inferno-7404.firebaseio.com/' + event_key);
    DataStore.on("value", updateTransactionList);
    addList(data_names, "families", userSelectedFn);
    $("#logout").click(logout)
    addList(data_food, "foodlist", foodSelectedFn);
    $("#yes").click(confirmed);
    $("#no").click(cancelled);
    $(".continue").click(function () {
        setState("select");
    });
    setState("login");
}



$(main);

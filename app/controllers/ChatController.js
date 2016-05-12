(function() {
	'use strict';
	
	angular
	.module('web')
	.controller('ChatController', ChatController);
	
	var _authData = null;
	var _firebaseAuth = null;
	var _mentionRegex = null;
	var _isAnonymous = true;

	/* @ngInject */
	function ChatController(// jshint ignore:line
	$scope, data, $firebaseAuth, utils, focus, $firebaseObject, 
	$sce, $firebaseArray, $q, notify, $uibModal, $timeout, user, alert, 
	config, localStorageService
	) {

		var MAX_VIEWER_LIST_QUERY_COUNT = 200;
		
		var _max_messages = 200;
		var _firebase = null ;var _roomId = null ;
		var _joinedUsers = {};
		var _userRelatedWatches = [];
		var _nonuserRelatedWatches = [];
		var _placeholderDefault = 'Message the channel'
		var _placeholderSlowMode = 'Slow mode active'
		var _userInfoModalInstance = null ;
		var _limitRate;
		var _limitPer;
		var _limitTimeStart;
		var _slowModeRate = 1;
		var _slowModePer = 30;
		var _limitAllowance;
		// messages
		var _limitLastCheck = new Date().getTime();
		var _joined = false;
		var _enableSetFocus = !user.mobile;
		var firstModeratorCheck = true;
		var firstSlowModeCheck = true;
		var vm = this;

		vm.placeholder = '';
		vm.sendMessage = sendMessage;
		vm.messages = null ;
		vm.isAnonymous = true;
		vm.sendEnabled = false;
		vm.notifications = notify.getList('chat').list;
		vm.isOwner = false;
		vm.isModerator = false;
		vm.isAdmin = false;
		vm.chatSlowModeEnabled = false;
		vm.joinRoom = joinRoom;
		vm.toggleChatSlowMode = toggleChatSlowMode;
		vm.showUserOptions = showUserOptions;
		vm.messageBoxClicked = updateMuteStatus;
		vm.formatUrl = utils.formatUrl;
		vm.tabs = [{
			title: 'Chat'
		}, {
			title: 'Viewers'
		}]
		vm.setFocus = setFocus;
		vm.sortViewerList = sortViewerList;
		vm.formatMessage = formatMessage;
		vm.shouldHideMessage = shouldHideMessage;
		vm.canModerate = canModerate
		vm.banned = false;
		vm.config = config;
		vm.slowModeEnabledIcon = config.cdnRoot + '/static/com/mobcrush/images/chat/ic-chat-slowmode-active.png';
		vm.slowModeDisabledIcon = config.cdnRoot + '/static/com/mobcrush/images/chat/ic-chat-slowmode.png';
		$scope.$on('load-chat', function(ev, chatOptions) {
			console.log('load-chat', ev, chatOptions);
			joinRoom(chatOptions)
		})
		$scope.$on('leave-chat', leaveRoom)
		$scope.$on('logged-out', reauthenticate)
		$scope.$on('logged-in', reauthenticate)
		$scope.$on('authenticated', joinRoom)
		
		// Enter / Leave Rooms
		
		function joinRoom(chatOptions) {
			console.log('joinRoom', chatOptions);
			_joined = true;
			var oldRoomId = null ;
			if (chatOptions) {
				oldRoomId = _roomId;
				_roomId = chatOptions.roomId || _roomId;
				_enableSetFocus = _enableSetFocus && (!chatOptions.disableSetFocus);
				_max_messages = chatOptions.max_messages || _max_messages;
			}
			if (oldRoomId && oldRoomId !== _roomId) {
				leaveRoom();
			}
			
			_firebase = _firebase || new Firebase(config.firebaseHost);
			if (!_authData)
				return authenticate();
			
			vm.sendEnabled = false;
			vm.chatReady = false;
			var firebaseLoadPromises = [];
			
			if (!vm.users) {
				vm.users = $firebaseArray(_firebase.child('room-users')
				.child(_roomId)
				.orderByChild('timestamp')
				.limitToFirst(MAX_VIEWER_LIST_QUERY_COUNT)
				)
				firebaseLoadPromises.push(vm.users)
				_nonuserRelatedWatches.push(vm.users)
			}
			if (!vm.roomMetaData) {
				vm.roomMetadata = $firebaseObject(_firebase.child('room-metadata')
				.child(_roomId)
				)
				firebaseLoadPromises.push(vm.roomMetadata)
				_nonuserRelatedWatches.push(vm.roomMetadata)
			}
			if (!vm.isAnonymous) {
				vm.muteStatus = $firebaseObject(_firebase.child('room-muted-users')
				.child(_roomId)
				.child(_authData.uid)
				)
				firebaseLoadPromises.push(vm.muteStatus)
				_userRelatedWatches.push(vm.muteStatus)
				
				vm.moderatorStatus = $firebaseObject(_firebase.child('room-moderators')
				.child(_roomId)
				.child(_authData.uid)
				)
				firebaseLoadPromises.push(vm.moderatorStatus)
				_userRelatedWatches.push(vm.moderatorStatus)
				
				vm.ignoredUsers = $firebaseArray(_firebase.child('ignored-users')
				.child(_authData.uid)
				)
				firebaseLoadPromises.push(vm.ignoredUsers)
				_userRelatedWatches.push(vm.ignoredUsers)
			}
			vm.roomMetadata.$loaded(function() {
				vm.isOwner = (user.isSet() && vm.roomMetadata.createdBy === _authData.uid)
				if (vm.roomMetadata.rateLimit)
					vm.chatSlowModeEnabled = vm.roomMetadata.rateLimit.enabled
				setRateLimits(canModerate())
				
				if (localStorageService.get(_roomId)) {
					var rateLimitInfo = localStorageService.get(_roomId);
					_limitAllowance = rateLimitInfo.limitAllowance;
					_limitTimeStart = rateLimitInfo.limitTimeStart;
					_limitLastCheck = rateLimitInfo.limitLastCheck;
				}
				
				_nonuserRelatedWatches.push(vm.roomMetadata.$watch(updateChatMode))
				updateChatMode();
				
				localStorageService.remove(_roomId)
			})
			$q.all(firebaseLoadPromises).then(function roomReady() {
				vm.chatReady = true;
				vm.sendEnabled = true;
				if (_enableSetFocus)
					focus('focus-input')
				if (vm.muteStatus) {
					_userRelatedWatches.push(vm.muteStatus.$watch(updateMuteStatus))
					vm.muteStatus.$loaded(enablePresence)
				}
				if (vm.moderatorStatus)
					_userRelatedWatches.push(vm.moderatorStatus.$watch(updateModeratorStatus))
				//autoSpam(200)
				trackAndNotifyPresence()
			})
			if (!vm.messages) {
				vm.messages = $firebaseArray(_firebase.child('room-messages')
				.child(_roomId)
				.limitToLast(_max_messages)
				)
				_nonuserRelatedWatches.push(vm.messages)
			}
		}
		/*
		----- SNIP -----
		Lots of unmodified code removed to improve readability for this demo
		*/
		
		// *** Authentication ***
		
		function reauthenticate() {
			// This doesn't kill your authToken, just does some quick cleanup.
			if (!_joined)
				return;
			clearWatchArray(_userRelatedWatches);
			_mentionRegex = null;
			_firebaseAuth = null;
			vm.isAdmin = false;
			vm.isModerator = false;
			firstModeratorCheck = true;
			removePresence();
			authenticate()
		}
		
		function authenticate() {
			if (!_firebaseAuth) {
				if (user.isSet()) {
					_firebaseAuth = data.firebase.getAuthToken()
					.then(authWithToken);
				} else {
					_firebaseAuth = Promise.resolve()
					.then(authAnonymously);
				}
			}
			_firebaseAuth.then(resolveAuth)
			.then(function(){
				$scope.$broadcast('authenticated');
			});
		}

		function authWithToken(token) {
			return new Promise(function(resolve){
				_firebase.authWithCustomToken(token, function(error, authData) {
					if (error) {
						authAnonymously().then(resolve);
					} else {
						_isAnonymous = false;
						_authData = authData;
						resolve();
					}
				})
			})
		}
		
		function authAnonymously() {
			return new Promise(function(resolve){
				_firebase.authAnonymously(function(error, authData) {
					if (error) {
						throw error
					} else {
						_isAnonymous = true;
						_authData = authData;
						resolve();
					}
				});	
			});
		}

		function resolveAuth(){
			if (_isAnonymous){
				vm.isAnonymous = true;
			} else {
				vm.isAnonymous = false;
				// Setup mentions
				var username = utils.escapeRegex(user.get().username);
				_mentionRegex = new RegExp('(^|[^a-zA-Z0-9])(@?' + username + ')([^a-zA-Z0-9]|$)','i');
				// Check if user is a global moderator.
				_firebase.child('global-moderators')
				.child(_authData.uid)
				.once('value', function(snapshot) {
					var val = snapshot.val()
					vm.isAdmin = val && !!val[_authData.uid];
				})
			}
		}
		
		// // *** Debug ***
		
		// var spamWatch;
		// function autoSpam(timer)
		// {
		//     spamWatch = $timeout(function() {
		//         var m = [];
		//         var total = ((Math.random() * 200) + 3)
		//         for (var i = 0; i < total; i ++)
		//         {
		//             m.push('a')
		//         }
		//         vm.messages.$add({
		//             message: m.join(''),
		//             username: user.get().username,
		//             userId: _authData.uid,
		//             profileLogoSmall: (user.get().profileLogoSmall || null),
		//             timestamp: Firebase.ServerValue.TIMESTAMP
		//         })
		//         autoSpam(timer)
		//     }, timer)
		// }
	}


	ChatController.$inject = ["$scope", "data", "$firebaseAuth", "utils", "focus", "$firebaseObject", "$sce", "$firebaseArray", "$q", "notify", "$uibModal", "$timeout", "user", "alert", "config", "localStorageService"];
})();
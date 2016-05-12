(function() {
	'use strict';
	
	angular
	.module('web')
	.controller('BroadcastTileController', BroadcastTileController);
	
	/* @ngInject */
	function BroadcastTileController($scope, $anchorScroll, utils, config, $state) {
		var vm = this;
		vm.getBroadcastSnapshotUrl = utils.getBroadcastSnapshotUrl;
		vm.goToChannel = goToChannel;
		vm.showLiveViewerCounts = config.showLiveViewerCounts;
		activate();
		////////////////
		function goToChannel(category) {
			scrollTop();
			$scope.$emit('set-last-filter-category', utils.toCamelCase(category));
			if (vm.tile.isLive || vm.tile.preferChannelLink) {
				if (vm.tile.channel.type === 'user') {
					$state.go('channel', {
						channel: vm.tile.channel.url
					});
				} else {
					$state.go('channelMulti', {
						channel: vm.tile.channel.url,
						userUrl: vm.tile.user.url
					});
				}
			} else {
				$state.go('broadcast', {
					channel: vm.tile.channel.url,
					broadcastId: vm.tile._id
				});
			}
		
		}
		
		function scrollTop() {
			$anchorScroll({
				yOffset: 0
			});
		}
		
		function activate() {
			if (!$scope.broadcast)
				return;
			vm.tile = $scope.broadcast;
		}
	}
	BroadcastTileController.$inject = ["$scope", "$anchorScroll", "utils", "config", "$state"];
})();
<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Redis;

class UsersController extends Controller {
	
	/**
	 * @return array
	 * @throws \Exception
	 */
	public function index() {
		$redisKey = 'users';
		$users = Redis::get($redisKey);
		
		if ($users) {
			$users = json_decode($users);
		}
		else {
			$users = $this->getUsersList();
			
			Redis::set($redisKey, json_encode($users));
			Redis::expire($redisKey, 300);
		}
		
		usort($users, function ($a, $b) {
			return $a->lastname <=> $b->lastname;
		});
		
		return [
			'users' => $users,
		];
	}
	
	
	/**
	 * @return array
	 * @throws \Exception
	 */
	protected function getUsersList(): array {
		$response = $this->makeRedmineRequest('users');
		
		if (!isset($response->users)) {
			throw new \Exception('No users found');
		}
		
		return $response->users;
	}
}

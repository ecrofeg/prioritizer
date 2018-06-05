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
		$limit = 100;
		$offset = 0;
		
		$response = $this->getUsers($limit, $offset);
		$users = $response->users;
		
		$totalCount = (int) $response->total_count;
		$iterations = ceil($totalCount / $limit);
		
		// Redmine allows us to fetch only 100 items per request.
		for ($i = 1; $i < $iterations; $i++) {
			$offset = $i * 100;
			$response = $this->getUsers($limit, $offset);
			$users = array_merge($users, $response->users);
		}
		
		return $users;
	}
	
	/**
	 * @param int $limit
	 * @param int $offset
	 *
	 * @return \stdClass
	 */
	protected function getUsers($limit, $offset): \stdClass {
		return $this->makeRedmineRequest('users', [
			// Get only active users.
			'status' => 1,
			// Max limit is 100 :(
			'limit'  => $limit,
			// Start index.
			'offset' => $offset,
		]);
	}
}

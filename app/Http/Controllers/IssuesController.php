<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Support\Facades\Input;
use Illuminate\Support\Facades\Redis;
use GuzzleHttp\Client;

class IssuesController extends Controller {
	
	/**
	 * @var Client
	 */
	protected $client = null;
	
	/**
	 * @var bool
	 */
	protected $isBugsDay = false;
	
	public function __construct() {
		header('Access-Control-Allow-Origin: *');
		
		$this->client = new Client([
			'base_uri' => env('REDMINE_API_URL'),
			'headers'  => [
				'X-Redmine-API-Key' => env('REDMINE_API_KEY'),
			],
		]);
		
		$this->isBugsDay = date('N') === static::BUGS_DAY_INDEX;
	}
	
	/**
	 * @param string $userId
	 *
	 * @return array
	 */
	public function index(string $userId = 'me') {
		try {
			$forceUpdate = Input::get('forceUpdate', false);
			$redisIssuesKey = 'issues:user:' . $userId;
			$redisUserKey = 'user:' . $userId;
			$issues = Redis::get($redisIssuesKey);
			$user = Redis::get($redisUserKey);
			
			if ($user && !$forceUpdate) {
				$user = json_decode($user);
			}
			else {
				$user = $this->getUserInfo($userId === 'me' ? 'current' : $userId);
				
				Redis::set($redisUserKey, json_encode($user));
				Redis::expire($redisUserKey, 300);
			}
			
			if ($issues && !$forceUpdate) {
				$issues = json_decode($issues);
			}
			else {
				$issues = $this->getIssuesForUser($userId);
				
				Redis::set($redisIssuesKey, json_encode($issues));
				Redis::expire($redisIssuesKey, 300);
			}
			
			usort($issues, function ($a, $b) {
				return $this->getPriorityForIssue($b) <=> $this->getPriorityForIssue($a);
			});
			
			return [
				'issues' => $issues,
				'user'   => $user,
			];
		}
		catch (\Exception $exception) {
			return $this->error($exception->getMessage());
		}
	}
	
	const BUGS_DAY_INDEX = '3';
	const DEADLINE_FOR_PLAN_ID = 25;
	const NEED_COMMENTS_STATUS_ID = 4;
	
	/**
	 * @var array
	 */
	protected $prioritiesWeight = [
		'3' => 0, // низкий
		'4' => 10, // средний
		'5' => 20, // высокий
		'6' => 100, // критический
		'7' => 200, // блокер
	];
	
	/**
	 * @param \stdClass $issue
	 *
	 * @return int
	 */
	protected function getPriorityForIssue(\stdClass $issue): int {
		$result = $this->prioritiesWeight[$issue->priority->id];
		$deadlineForIssue = $this->issueIsInPlan($issue);
		
		// Если задача со статусом "Требует комментария", то повышаем приоритет.
		// Такие задачи должны разбираться постоянно, и если задача занимает
		// больше 5-10 минут, то надо сменить ей статус на другой.
		if ($issue->status->id === static::NEED_COMMENTS_STATUS_ID) {
			$result += 30;
		}
		
		if ($deadlineForIssue) {
			// Если задача плановая и сегодня не среда, то повышаем ее приоритет.
			// Если сегодня среда, то понижаем приоритет.
			$result += $this->isBugsDay ? -15 : 15;
			
			// Парсим дедлайн для плановой задачи.
			$deadlineDate = Carbon::parse($deadlineForIssue);
			$daysLeft = Carbon::now()->diffInDays($deadlineDate, false);
			
			if ($daysLeft <= 0) {
				// Если дедлайн просрочен, то резко повышаем приоритет задачи.
				$result += 15;
			}
			else {
				// Если дедлайн не просрочен, то пропорционально повышаем приоритет.
				$result += -($daysLeft * 0.5);
			}
		}
		else {
			// Если задача из текучки (вне плана) и сегодня среда, то повышаем ее приоритет.
			$result += $this->isBugsDay ? 15 : -15;
		}
		
		$issue->rating = $result;
		
		return $result;
	}
	
	/**
	 * @param \stdClass $issue
	 *
	 * @return string
	 */
	protected function issueIsInPlan(\stdClass $issue): string {
		$result = '';
		
		if (isset($issue->custom_fields)) {
			foreach ($issue->custom_fields as $field) {
				if ($field->id === static::DEADLINE_FOR_PLAN_ID && $field->value) {
					$result = $field->value;
					false;
				}
			}
		}
		
		return $result;
	}
	
	/**
	 * @param string $text
	 *
	 * @return array
	 */
	protected function error(string $text) {
		return abort(500, $text);
	}
	
	/**
	 * @param string $userId
	 *
	 * @return object
	 * @throws \Exception
	 */
	protected function getUserInfo(string $userId): object {
		$response = $this->makeRedmineRequest('users/' . $userId);
		
		if (!isset($response->user)) {
			throw new \Exception('User not found');
		}
		
		return $response->user;
	}
	
	/**
	 * @param string $userId
	 *
	 * @return array
	 * @throws \Exception
	 */
	protected function getIssuesForUser(string $userId): array {
		$response = $this->makeRedmineRequest('issues', [
			'assigned_to_id' => $userId,
		]);
		
		if (!isset($response->issues)) {
			throw new \Exception('No issues found');
		}
		
		return $response->issues;
	}
	
	/**
	 * @param string $uri
	 * @param array $params
	 *
	 * @return object
	 */
	protected function makeRedmineRequest(string $uri, array $params = []): object {
		$defaultParams = [
			'assigned_to_id' => 'me',
		];
		
		$requestParams = array_merge($defaultParams, $params);
		
		$response = $this->client->get($uri . '.json', [
			'query' => $requestParams,
		]);
		
		return json_decode($response->getBody()->getContents());
	}
}

<?php

namespace App\Http\Controllers;

class IssuesController extends Controller
{
    public function index() {
    	return [
    		'123' => '123'
		];
	}
	
	protected function makeRedmineRequest($params) {
 
	}
}
